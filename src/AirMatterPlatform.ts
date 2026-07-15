/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * AirMatterPlatform.ts: @homebridge-plugins/homebridge-air.
 */
import type { API, Logging, MatterAccessory, PlatformAccessory } from 'homebridge'

import type { AirPlatformConfig, devicesConfig } from './settings.js'

import { devices } from 'homebridge'

import { AirQualitySensorMatter } from './devices/airqualitysensormatter.js'
import { AirPlatform } from './platform.js'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'

/**
 * Map a HomeKit AQI level (1-5) to a Matter AirQuality enum value.
 *
 * HomeKit levels:  1=Excellent, 2=Good, 3=Fair, 4=Inferior, 5=Poor
 * Matter AirQuality: 0=Unknown, 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=VeryPoor, 6=ExtremelyPoor
 */
function toMatterAirQuality(homeKitAQI: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  switch (homeKitAQI) {
    case 1: return 1 // Excellent → Good
    case 2: return 2 // Good → Fair
    case 3: return 3 // Fair → Moderate
    case 4: return 5 // Inferior → VeryPoor
    case 5: return 6 // Poor → ExtremelyPoor
    default: return 0 // Unknown
  }
}

/**
 * AirMatterPlatform
 *
 * Extends AirPlatform (HAP) and overrides device discovery to register
 * Air Quality sensors as Matter accessories instead of HAP accessories.
 *
 * This platform is selected when `options.enableMatter` or `options.preferMatter`
 * is set to `true` in the plugin configuration AND Matter is available/enabled
 * in Homebridge.
 */
export class AirMatterPlatform extends AirPlatform {
  // Track cached Matter accessories (keyed by UUID)
  public readonly matterAccessories: Map<string, MatterAccessory> = new Map()

  // Track the polling sensor instance for each Matter accessory (keyed by UUID)
  public readonly matterSensors: Map<string, AirQualitySensorMatter> = new Map()

  constructor(
    log: Logging,
    config: AirPlatformConfig,
    api: API,
  ) {
    super(log, config, api)

    if (!this.api.isMatterAvailable?.()) {
      this.log.warn('Matter is not available in this version of Homebridge. Please update Homebridge to use Matter features.')
    }

    if (!this.api.isMatterEnabled?.()) {
      this.log.warn('Matter is not enabled in Homebridge. Please enable Matter in the Homebridge settings to use Matter features.')
    }
  }

  /**
   * Override configureAccessory to unregister any previously cached HAP accessories.
   *
   * When a user switches from HAP to Matter mode, Homebridge will restore cached
   * HAP accessories on startup. In Matter mode these stale HAP accessories must be
   * removed so they do not accumulate untracked in the Homebridge accessory cache.
   */
  async configureAccessory(accessory: PlatformAccessory): Promise<void> {
    await this.debugLog(`Unregistering stale HAP accessory (Matter mode active): ${accessory.displayName}`)
    await Promise.resolve(this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]))
  }

  /**
   * Matter's BridgedDeviceBasicInformation.NodeLabel is constrained to 32 characters.
   * Homebridge sets the nodeLabel from the accessory displayName, so longer names make
   * the whole endpoint fail to register with "Behaviors have errors".
   */
  private clampMatterDisplayName(displayName: string): string {
    if (displayName.length <= 32) {
      return displayName
    }
    const clamped = displayName.slice(0, 32).trim()
    this.log.debug(`Display name "${displayName}" exceeds Matter's 32 character limit, using "${clamped}"`)
    return clamped
  }

  /**
   * Called when Homebridge restores cached Matter accessories from disk at startup.
   */
  configureMatterAccessory(accessory: MatterAccessory): void {
    this.log.debug(`Loading cached Matter accessory: ${accessory.displayName}`)
    this.matterAccessories.set(accessory.UUID, accessory)
  }

  /**
   * Override discoverDevices to register Air Quality devices as Matter accessories.
   */
  async discoverDevices(): Promise<void> {
    try {
      if (this.config.devices) {
        for (const device of this.config.devices) {
          device.city = device.city ? device.city : 'Unknown'
          device.zipCode = device.zipCode ? device.zipCode : '00000'
          device.provider = device.provider ? device.provider : 'Unknown'
          if (device.latitude && device.longitude) {
            try {
              device.latitude = Number.parseFloat(Number.parseFloat(device.latitude.toString()).toFixed(6))
              device.longitude = Number.parseFloat(Number.parseFloat(device.longitude.toString()).toFixed(6))
            } catch {
              await this.errorLog('Latitude and Longitude must be a number')
            }
          }
          await this.debugLog(`Discovered ${device.city}`)
          await this.createMatterAirQualitySensor(device)
        }
      }
    } catch {
      await this.errorLog('discoverDevices, No Device Config')
    }
  }

  /**
   * Register or restore a single Air Quality device as a Matter accessory and
   * start its polling loop.
   */
  public async createMatterAirQualitySensor(device: devicesConfig): Promise<void> {
    const uuidString = (device.latitude && device.longitude)
      ? (`${device.latitude}` + `${device.longitude}` + `${device.provider}`)
      : (`${device.zipCode}` + `${device.city}` + `${device.provider}`)
    const uuid = this.api.hap.uuid.generate(uuidString)

    // Handle hide_device: remove any existing Matter accessory then bail out.
    if (device.hide_device) {
      const existingAccessory = this.matterAccessories.get(uuid)
      if (existingAccessory) {
        await this.warnLog(`Removing Matter accessory for hidden device: ${existingAccessory.displayName}`)
        await this.api.matter?.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory])
        this.matterAccessories.delete(uuid)
      } else {
        await this.debugLog(`Skipping hidden device (no cached Matter accessory): ${device.city}`)
      }
      return
    }

    const displayName = this.clampMatterDisplayName(await this.validateAndCleanDisplayName(
      device.city ?? 'Unknown',
      'city',
      device.city ?? 'Unknown',
      device.provider,
    ))

    const manufacturer = device.provider === 'airnow' ? 'AirNow' : device.provider === 'aqicn' ? 'Aqicn' : 'Unknown'
    const firmwareRevision = device.firmware ?? await this.getVersion()

    const existingAccessory = this.matterAccessories.get(uuid)

    if (existingAccessory) {
      await this.infoLog(`Restoring existing Matter accessory from cache: ${displayName}`)
      // Update context with latest device info
      if (existingAccessory.context) {
        existingAccessory.context.device = device as unknown as Record<string, unknown>
        existingAccessory.context.serialNumber = this.generateSerialNumber(device)
        existingAccessory.context.model = manufacturer
        existingAccessory.context.FirmwareRevision = firmwareRevision
      }
      await this.api.matter?.updatePlatformAccessories([existingAccessory])
    } else {
      await this.infoLog(`Adding new Matter accessory: ${displayName}`)

      const accessory: MatterAccessory = {
        UUID: uuid,
        displayName,
        deviceType: devices.AirQualitySensorDevice,
        serialNumber: this.generateSerialNumber(device),
        manufacturer,
        model: manufacturer,
        firmwareRevision,
        context: {
          device,
          serialNumber: this.generateSerialNumber(device),
          model: manufacturer,
          FirmwareRevision: firmwareRevision,
        },
        clusters: {
          airQuality: {
            airQuality: toMatterAirQuality(0),
          },
        },
      }

      this.matterAccessories.set(uuid, accessory)
      await this.api.matter?.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
      await this.debugLog(`${device.city} uuid: ${uuidString}`)
    }

    // Start polling loop: fetch AQI from the provider API and push to Matter state.
    this.matterSensors.set(uuid, new AirQualitySensorMatter(this, device, uuid))
  }

  /**
   * Update the air quality state for a device after fetching fresh data.
   *
   * @param uuid - The Matter accessory UUID.
   * @param homeKitAQI - HomeKit AQI level (1-5).
   */
  public async updateMatterAirQuality(uuid: string, homeKitAQI: number): Promise<void> {
    const matterAQ = toMatterAirQuality(homeKitAQI)
    await this.api.matter?.updateAccessoryState(uuid, 'airQuality', { airQuality: matterAQ })
    await this.debugLog(`Updated Matter air quality for ${uuid}: ${matterAQ}`)
  }
}
