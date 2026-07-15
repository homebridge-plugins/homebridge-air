/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * platform.ts: @homebridge-plugins/homebridge-air.
 */
import type { API, DynamicPlatformPlugin, HAP, Logging, MatterAccessory, PlatformAccessory } from 'homebridge'

import type { AirPlatformConfig, devicesConfig, options } from './settings.js'

import { readFileSync } from 'node:fs'
import { argv } from 'node:process'

import { AirQualitySensor } from './devices/airqualitysensor.js'
import { PLATFORM_NAME, PLUGIN_NAME, resolveAqicnLocationSegment } from './settings.js'

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class AirPlatform implements DynamicPlatformPlugin {
  public accessories: PlatformAccessory[]
  public readonly matterAccessories: Map<string, MatterAccessory>
  public readonly api: API
  public readonly log: Logging
  protected readonly hap: HAP
  public config!: AirPlatformConfig

  platformConfig!: AirPlatformConfig
  platformLogging!: options['logging']
  platformRefreshRate!: options['refreshRate']
  platformPushRate!: options['pushRate']
  platformUpdateRate!: options['updateRate']
  debugMode!: boolean
  version!: string

  constructor(
    log: Logging,
    config: AirPlatformConfig,
    api: API,
  ) {
    this.accessories = []
    this.matterAccessories = new Map()
    this.api = api
    this.hap = this.api.hap
    this.log = log
    // only load if configured
    if (!config) {
      return
    }

    // Plugin options into our config variables.
    this.config = {
      platform: PLATFORM_NAME,
      name: config.name,
      devices: config.devices as devicesConfig[],
      refreshRate: config.refreshRate as number,
      logging: config.logging as string,
    }

    // Plugin Configuration
    this.getPlatformLogSettings()
    this.getPlatformRateSettings()
    this.getPlatformConfigSettings()
    void this.getVersion().catch((e: any) => {
      if (this.errorLog) {
        this.errorLog(`getVersion() failed: ${e?.message ?? e}`)
      } else {
        console.error(`getVersion() failed: ${e?.message ?? e}`)
      }
    })

    // Finish initializing the platform
    this.debugLog(`Finished initializing platform: ${config.name}`);

    // verify the config
    (async () => {
      try {
        await this.verifyConfig()
        await this.debugLog('Config OK')
      } catch (e: any) {
        await this.errorLog(`Verify Config, Error Message: ${e.message}, Submit Bugs Here: https://bit.ly/homebridge-air-bug-report`)
        this.debugErrorLog(`Verify Config, Error: ${e}`)
      }
    })()

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback')
      // run the method to discover / register your devices as accessories
      try {
        await this.discoverDevices()
      } catch (e: any) {
        await this.errorLog(`Failed to Discover Devices ${JSON.stringify(e.message ?? e)}`)
      }
    })
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  async configureAccessory(accessory: PlatformAccessory) {
    await this.debugLog(`Loading accessory from cache: ${accessory.displayName} (UUID: ${accessory.UUID})`)

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory)
  }

  /**
   * In HAP mode, proactively remove stale cached Matter accessories.
   *
   * This keeps fallback behavior deterministic when users switch from Matter
   * back to HAP and prevents duplicate/orphaned accessories.
   */
  configureMatterAccessory(accessory: MatterAccessory): void {
    if (!this.api.matter?.unregisterPlatformAccessories) {
      void this.debugLog(`Skipping stale Matter accessory cleanup (Matter API unavailable): ${accessory.displayName}`)
      return
    }

    this.matterAccessories.set(accessory.UUID, accessory)
    void this.removeStaleMatterAccessory(accessory)
  }

  private async removeStaleMatterAccessory(accessory: MatterAccessory): Promise<void> {
    await this.warnLog(`Removing stale Matter accessory (HAP mode active): ${accessory.displayName}`)
    await this.api.matter?.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
    this.matterAccessories.delete(accessory.UUID)
  }

  /**
   * Verify the config passed to the plugin is valid
   */
  async verifyConfig() {
    /**
     * Hidden Device Discovery Option
     * This will disable adding any device and will just output info.
     */
    this.config.logging = this.config.logging || 'standard'

    if (!this.config.refreshRate) {
      // default 3600 seconds (1 hour)
      this.config.refreshRate! = 3600
      await this.infoLog('Using Default Refresh Rate of 1 hour')
    }
    // Device Config
    if (this.config.devices) {
      for (const deviceConfig of this.config.devices) {
        const provider = (deviceConfig.provider || '').toLowerCase()
        const hasCity = Boolean(deviceConfig.city)
        const hasZipCode = Boolean(deviceConfig.zipCode)
        const hasLatitude = deviceConfig.latitude !== undefined && deviceConfig.latitude !== null
        const hasLongitude = deviceConfig.longitude !== undefined && deviceConfig.longitude !== null

        if (!deviceConfig.apiKey) {
          await this.errorLog(`Missing API key for ${provider || 'unknown'} provider`)
        }

        if (hasLatitude !== hasLongitude) {
          const missing = !hasLatitude ? 'Latitude' : 'Longitude'
          await this.errorLog(`Missing your ${missing}`)
        }

        if (provider === 'airnow') {
          const hasZipAndCity = hasZipCode && hasCity
          const hasCoordinates = hasLatitude && hasLongitude
          if (!hasZipAndCity && !hasCoordinates) {
            await this.errorLog('AirNow requires either (zipCode + city) or (latitude + longitude)')
          }
        } else if (provider === 'aqicn') {
          const hasCoordinates = hasLatitude && hasLongitude
          if (!hasCity && !hasCoordinates) {
            await this.errorLog('AQICN requires either city/station path/URL or (latitude + longitude)')
          }
        } else {
          await this.errorLog(`Unknown provider '${deviceConfig.provider}'. Supported providers: airnow, aqicn`)
        }
      }
    } else {
      await this.errorLog('verifyConfig, No Device Config')
    }
  }

  /**
   * This method is used to discover the your location and devices.
   * Accessories are registered by either their DeviceClass, DeviceModel, or DeviceID
   */
  async discoverDevices() {
    try {
      if (this.config.devices) {
        const configuredUUIDs = new Set<string>()
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
          configuredUUIDs.add(this.generateAccessoryUUID(device))
          await this.debugLog(`Discovered ${device.city}`)
          await this.createAirQualitySensor(device)
        }
        await this.removeStaleAccessories(configuredUUIDs)
      }
    } catch {
      await this.errorLog('discoverDevices, No Device Config')
    }
  }

  /**
   * Build the accessory uuid for a configured device. Shared by discovery and
   * registration so the two can never disagree on an accessory's identity.
   */
  public generateAccessoryUUID(device: any): string {
    const uuidString = (device.latitude && device.longitude) ? (`${device.latitude}` + `${device.longitude}` + `${device.provider}`) : (`${device.zipCode}` + `${device.city}` + `${device.provider}`)
    return this.api.hap.uuid.generate(uuidString)
  }

  /**
   * Build the serial number shown in HomeKit.
   *
   * AirNow devices are identified by their zip code, but AQICN devices have
   * none, so every one of them fell back to a meaningless shared '00000'.
   * Use the station id instead, which is already unique per station (#49).
   */
  public generateSerialNumber(device: any): string {
    if (device.provider === 'aqicn') {
      return resolveAqicnLocationSegment(device) || '00000'
    }
    return device.zipCode ?? '00000'
  }

  /**
   * Remove cached accessories for devices that are no longer in the config.
   *
   * Without this, editing or deleting a device leaves its accessory in
   * HomeKit forever with no way for the user to clear it (#49).
   */
  private async removeStaleAccessories(configuredUUIDs: Set<string>) {
    const staleAccessories = this.accessories.filter(accessory => !configuredUUIDs.has(accessory.UUID))
    for (const staleAccessory of staleAccessories) {
      await this.unregisterPlatformAccessories(staleAccessory)
    }
  }

  public async createAirQualitySensor(device: any) {
    // generate a unique id for the accessory
    const uuid = this.generateAccessoryUUID(device)

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid)

    if (existingAccessory) {
      // the accessory already exists
      if (!device.hide_device) {
        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        existingAccessory.context.device = device
        existingAccessory.displayName = await this.validateAndCleanDisplayName(device.city, 'city', device.city, device.provider)
        existingAccessory.context.serialNumber = this.generateSerialNumber(device)
        existingAccessory.context.model = device.provider === 'airnow' ? 'AirNow' : device.provider === 'aqicn' ? 'Aqicn' : 'Unknown'
        existingAccessory.context.FirmwareRevision = device.firmware ?? await this.getVersion()
        this.api.updatePlatformAccessories([existingAccessory])
        // Restore accessory
        await this.infoLog(`Restoring existing accessory from cache: ${existingAccessory.displayName}`)
        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        existingAccessory.control = new AirQualitySensor(this, existingAccessory, device)
        await this.debugLog(`${device.city} uuid: ${uuid}`)
      } else {
        this.unregisterPlatformAccessories(existingAccessory)
      }
    } else if (!device.hide_device && !existingAccessory) {
      // create a new accessory
      const cleanedDisplayName = await this.validateAndCleanDisplayName(device.city, 'city', device.city, device.provider)
      const accessory = new this.api.platformAccessory(cleanedDisplayName, uuid)

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      accessory.context.device = device
      accessory.displayName = cleanedDisplayName
      accessory.context.serialNumber = this.generateSerialNumber(device)
      accessory.context.model = device.provider === 'airnow' ? 'AirNow' : device.provider === 'aqicn' ? 'Aqicn' : 'Unknown'
      accessory.context.FirmwareRevision = device.firmware ?? await this.getVersion()
      // the accessory does not yet exist, so we need to create it
      await this.infoLog(`Adding new accessory: ${device.city}`)
      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      accessory.control = new AirQualitySensor(this, accessory, device)
      await this.debugLog(`${device.city} uuid: ${uuid}`)

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
      this.accessories.push(accessory)
    } else {
      this.debugErrorLog(`Unable to Register new device: ${JSON.stringify(device.city)}`)
    }
  }

  public async unregisterPlatformAccessories(existingAccessory: PlatformAccessory) {
    // remove platform accessories when no longer present
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory])
    // drop it from the tracked list too, so it cannot be unregistered twice
    const index = this.accessories.indexOf(existingAccessory)
    if (index > -1) {
      this.accessories.splice(index, 1)
    }
    await this.warnLog(`Removing existing accessory from cache: ${existingAccessory.displayName}`)
  }

  async getPlatformLogSettings() {
    this.debugMode = argv.includes('-D') ?? argv.includes('--debug')
    // Check both config.logging (root level) and config.options.logging for backward compatibility
    const configLogging = this.config.logging || this.config.options?.logging
    this.platformLogging = (configLogging === 'debug' || configLogging === 'standard' || configLogging === 'none')
      ? configLogging
      : this.debugMode ? 'debugMode' : 'standard'
    const loggingSource = this.config.logging ? 'Platform Config (root)' : this.config.options?.logging ? 'Platform Config (options)' : this.debugMode ? 'debugMode' : 'Default'
    await this.debugLog(`Using ${loggingSource} Logging: ${this.platformLogging}`)
  }

  async getPlatformRateSettings() {
    // RefreshRate - check both root level and options
    this.platformRefreshRate = this.config.refreshRate ?? this.config.options?.refreshRate ?? undefined
    const refreshRateSource = this.config.refreshRate ? 'Platform Config (root)' : this.config.options?.refreshRate ? 'Platform Config (options)' : 'Not Set'
    await this.debugLog(`Using ${refreshRateSource} refreshRate: ${this.platformRefreshRate}`)
    // UpdateRate
    this.platformUpdateRate = this.config.options?.updateRate ? this.config.options.updateRate : undefined
    const updateRate = this.config.options?.updateRate ? 'Using Platform Config updateRate' : 'Platform Config updateRate Not Set'
    await this.debugLog(`${updateRate}: ${this.platformUpdateRate}`)
    // PushRate
    this.platformPushRate = this.config.options?.pushRate ? this.config.options.pushRate : undefined
    const pushRate = this.config.options?.pushRate ? 'Using Platform Config pushRate' : 'Platform Config pushRate Not Set'
    await this.debugLog(`${pushRate}: ${this.platformPushRate}`)
  }

  async getPlatformConfigSettings() {
    if (this.config.options) {
      const platformConfig: AirPlatformConfig = {
        platform: 'Air',
      }
      platformConfig.logging = this.config.options.logging ? this.config.options.logging : undefined
      platformConfig.refreshRate = this.config.options.refreshRate ? this.config.options.refreshRate : undefined
      platformConfig.updateRate = this.config.options.updateRate ? this.config.options.updateRate : undefined
      platformConfig.pushRate = this.config.options.pushRate ? this.config.options.pushRate : undefined
      if (Object.entries(platformConfig).length !== 0) {
        await this.debugLog(`Platform Config: ${JSON.stringify(platformConfig)}`)
      }
      this.platformConfig = platformConfig
    }
  }

  /**
   * Asynchronously retrieves the version of the plugin from the package.json file.
   *
   * This method reads the package.json file located in the parent directory,
   * parses its content to extract the version, and logs the version using the debug logger.
   * The extracted version is then assigned to the `version` property of the class.
   *
   * @returns {Promise<string>} A promise that resolves with the version string.
   */
  async getVersion(): Promise<string> {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
    this.debugLog(`Plugin Version: ${version}`)
    this.version = version
    return version
  }

  /**
   * Generate a clean display name from AQICN station/city format
   * @param city - The AQICN city value which may contain station URLs or city paths
   * @returns A clean display name suitable for HomeKit
   */
  generateAqicnDisplayName(city: string): string {
    // Allow full AQICN URLs as input and convert to path form first.
    if (city.startsWith('http://') || city.startsWith('https://')) {
      try {
        const parsed = new URL(city)
        city = `/${parsed.pathname.replace(/^\/+|\/+$/g, '')}`
      } catch {
        // Keep original value if URL parsing fails.
      }
    }

    if (!city.startsWith('/')) {
      if (city.startsWith('station/') || city.startsWith('city/')) {
        city = `/${city}`
      }
    }

    // Handle AQICN station ID format: /station/@12345 -> Station 12345
    if (city.startsWith('/station/@')) {
      const stationId = city.replace('/station/@', '')
      return `Station ${stationId}`
    }

    // Handle AQICN station name format: /station/station-name/locale -> Station Name Locale
    if (city.startsWith('/station/')) {
      const parts = city.replace('/station/', '').split('/')
      return parts.map(part =>
        part.split('-').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1),
        ).join(' '),
      ).join(' ')
    }

    // Handle AQICN city path format: /city/country/cityname -> Country Cityname
    if (city.startsWith('/city/')) {
      const parts = city.replace('/city/', '').split('/')
      return parts.map(part =>
        part.split('-').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1),
        ).join(' '),
      ).join(' ')
    }

    // For regular city names, return as-is
    return city
  }

  /**
   * Validate and clean a string value for a Name Characteristic.
   * @param displayName - The display name of the accessory.
   * @param name - The name of the characteristic.
   * @param value - The value to be validated and cleaned.
   * @param provider - Optional provider type to handle special cases
   * @returns The cleaned string value.
   */
  async validateAndCleanDisplayName(displayName: string, name: string, value: string, provider?: string): Promise<string> {
    if (this.config.options?.allowInvalidCharacters) {
      return value
    } else {
      // For AQICN provider and city field, handle special station/city formats
      if (
        provider === 'aqicn'
        && name === 'city'
        && (
          value.startsWith('/station/')
          || value.startsWith('/city/')
          || value.startsWith('station/')
          || value.startsWith('city/')
          || value.startsWith('http://')
          || value.startsWith('https://')
        )
      ) {
        const cleanDisplayName = this.generateAqicnDisplayName(value)
        await this.debugLog(`Generated clean display name for AQICN ${name}: '${value}' -> '${cleanDisplayName}'`)
        return cleanDisplayName
      }

      const validPattern = /^[\p{L}\p{N}][\p{L}\p{N} ']*[\p{L}\p{N}]$/u
      const invalidCharsPattern = /[^\p{L}\p{N} ']/gu
      const invalidStartEndPattern = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu

      if (typeof value === 'string' && !validPattern.test(value)) {
        this.warnLog(`WARNING: The accessory '${displayName}' has an invalid '${name}' characteristic ('${value}'). Please use only alphanumeric, space, and apostrophe characters. Ensure it starts and ends with an alphabetic or numeric character, and avoid emojis. This may prevent the accessory from being added in the Home App or cause unresponsiveness.`)

        // Remove invalid characters
        if (invalidCharsPattern.test(value)) {
          const before = value
          this.warnLog(`Removing invalid characters from '${name}' characteristic, if you feel this is incorrect,  please enable \'allowInvalidCharacter\' in the config to allow all characters`)
          value = value.replace(invalidCharsPattern, '')
          this.warnLog(`${name} Before: '${before}' After: '${value}'`)
        }

        // Ensure it starts and ends with an alphanumeric character
        if (invalidStartEndPattern.test(value)) {
          const before = value
          this.warnLog(`Removing invalid starting or ending characters from '${name}' characteristic, if you feel this is incorrect, please enable \'allowInvalidCharacter\' in the config to allow all characters`)
          value = value.replace(invalidStartEndPattern, '')
          this.warnLog(`${name} Before: '${before}' After: '${value}'`)
        }
      }

      return value
    }
  }

  /**
   * If device level logging is turned on, log to log.warn
   * Otherwise send debug logs to log.debug
   */
  async infoLog(...log: any[]): Promise<void> {
    if (await this.enablingPlatformLogging()) {
      this.log.info(String(...log))
    }
  }

  async successLog(...log: any[]): Promise<void> {
    if (await this.enablingPlatformLogging()) {
      this.log.success(String(...log))
    }
  }

  async debugSuccessLog(...log: any[]): Promise<void> {
    if (await this.enablingPlatformLogging()) {
      if (await this.loggingIsDebug()) {
        this.log.success('[DEBUG]', String(...log))
      }
    }
  }

  async warnLog(...log: any[]): Promise<void> {
    if (await this.enablingPlatformLogging()) {
      this.log.warn(String(...log))
    }
  }

  async debugWarnLog(...log: any[]): Promise<void> {
    if (await this.enablingPlatformLogging()) {
      if (await this.loggingIsDebug()) {
        this.log.warn('[DEBUG]', String(...log))
      }
    }
  }

  async errorLog(...log: any[]): Promise<void> {
    if (await this.enablingPlatformLogging()) {
      this.log.error(String(...log))
    }
  }

  async debugErrorLog(...log: any[]): Promise<void> {
    if (await this.enablingPlatformLogging()) {
      if (await this.loggingIsDebug()) {
        this.log.error('[DEBUG]', String(...log))
      }
    }
  }

  async debugLog(...log: any[]): Promise<void> {
    if (await this.enablingPlatformLogging()) {
      if (this.platformLogging === 'debugMode') {
        this.log.debug(String(...log))
      } else if (this.platformLogging === 'debug') {
        this.log.info('[DEBUG]', String(...log))
      }
    }
  }

  async loggingIsDebug(): Promise<boolean> {
    return this.platformLogging === 'debugMode' || this.platformLogging === 'debug'
  }

  async enablingPlatformLogging(): Promise<boolean> {
    return this.platformLogging === 'debugMode' || this.platformLogging === 'debug' || this.platformLogging === 'standard'
  }
}
