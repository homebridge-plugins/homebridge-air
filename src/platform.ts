/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * platform.ts: homebridge-air.
 */
import type { API, DynamicPlatformPlugin, HAP, Logging, PlatformAccessory } from 'homebridge'

import type { AirPlatformConfig, devicesConfig, options } from './settings.js'

import { readFileSync } from 'node:fs'
import process, { argv } from 'node:process'

import { AirQualitySensor } from './devices/airqualitysensor.js'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class AirPlatform implements DynamicPlatformPlugin {
  public accessories: PlatformAccessory[]
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
    this.getVersion()

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
        await this.errorLog(`Failed to Discover Devices ${JSON.stringify(e.message)}`)
        this.debugErrorLog(`Failed to Discover, Error: ${e}`)
      }
    })
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  async configureAccessory(accessory: PlatformAccessory) {
    await this.infoLog(`Loading accessory from cache: ${accessory.displayName}`)

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory)
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
        if (!deviceConfig.apiKey) {
          await this.errorLog('Missing Your AirNow ApiKey')
        }
        if (deviceConfig.zipCode || deviceConfig.city) {
          if (!deviceConfig.zipCode || !deviceConfig.city) {
            const missing = !deviceConfig.zipCode ? 'Zip Code' : 'City'
            await this.errorLog(`Missing your ${missing}`)
          }
        }
        if (deviceConfig.latitude || deviceConfig.longitude) {
          if (!deviceConfig.latitude || !deviceConfig.longitude) {
            const missing = !deviceConfig.latitude ? 'Latitude' : 'Longitude'
            await this.errorLog(`Missing your ${missing}`)
          }
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
          this.createAirQualitySensor(device)
        }
      }
    } catch {
      await this.errorLog('discoverDevices, No Device Config')
    }
  }

  private async createAirQualitySensor(device: any) {
    // generate a unique id for the accessory
    const uuidString = (device.latitude && device.longitude) ? (`${device.latitude}` + `${device.longitude}` + `${device.provider}`) : (`${device.zipCode}` + `${device.city}` + `${device.provider}`)
    const uuid = this.api.hap.uuid.generate(uuidString)

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid)

    if (existingAccessory) {
      // the accessory already exists
      if (!device.delete) {
        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        existingAccessory.context.device = device
        existingAccessory.displayName = await this.validateAndCleanDisplayName(device.city, 'city', device.city)
        existingAccessory.context.serialNumber = device.zipCode
        existingAccessory.context.model = device.provider === 'airnow' ? 'AirNow' : device.provider === 'aqicn' ? 'Aqicn' : 'Unknown'
        existingAccessory.context.FirmwareRevision = device.firmware ?? await this.getVersion()
        this.api.updatePlatformAccessories([existingAccessory])
        // Restore accessory
        await this.infoLog(`Restoring existing accessory from cache: ${existingAccessory.displayName}`)
        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new AirQualitySensor(this, existingAccessory, device)
        await this.debugLog(`${device.city} uuid: ${uuidString}`)
      } else {
        this.unregisterPlatformAccessories(existingAccessory)
      }
    } else if (!device.delete && !existingAccessory) {
      // create a new accessory
      const accessory = new this.api.platformAccessory(device.city, uuid)

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      accessory.context.device = device
      accessory.displayName = await this.validateAndCleanDisplayName(device.city, 'city', device.city)
      accessory.context.serialNumber = device.zipCode
      accessory.context.model = device.provider === 'airnow' ? 'AirNow' : device.provider === 'aqicn' ? 'Aqicn' : 'Unknown'
      accessory.context.FirmwareRevision = device.firmware ?? await this.getVersion()
      // the accessory does not yet exist, so we need to create it
      await this.infoLog(`Adding new accessory: ${device.city}`)
      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new AirQualitySensor(this, accessory, device)
      await this.debugLog(`${device.city} uuid: ${uuidString}`)

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
    await this.warnLog(`Removing existing accessory from cache: ${existingAccessory.displayName}`)
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

  async getPlatformRateSettings() {
    this.platformRefreshRate = this.config.options?.refreshRate ? this.config.options.refreshRate : 0
    const refreshRate = this.config.options?.refreshRate ? 'Using Platform Config refreshRate' : 'refreshRate Disabled by Default'
    await this.debugLog(`${refreshRate}: ${this.platformRefreshRate}`)
    this.platformUpdateRate = this.config.options?.updateRate ? this.config.options.updateRate : 1
    const updateRate = this.config.options?.updateRate ? 'Using Platform Config updateRate' : 'Using Default updateRate'
    await this.debugLog(`${updateRate}: ${this.platformUpdateRate}`)
    this.platformPushRate = this.config.options?.pushRate ? this.config.options.pushRate : 1
    const pushRate = this.config.options?.pushRate ? 'Using Platform Config pushRate' : 'Using Default pushRate'
    await this.debugLog(`${pushRate}: ${this.platformPushRate}`)
  }

  async getPlatformLogSettings() {
    this.debugMode = argv.includes('-D') ?? argv.includes('--debug')
    this.platformLogging = (this.config.options?.logging === 'debug' || this.config.options?.logging === 'standard'
      || this.config.options?.logging === 'none')
      ? this.config.options.logging
      : this.debugMode ? 'debugMode' : 'standard'
    const logging = this.config.options?.logging ? 'Platform Config' : this.debugMode ? 'debugMode' : 'Default'
    await this.debugLog(`Using ${logging} Logging: ${this.platformLogging}`)
  }

  /**
   * Asynchronously retrieves the version of the plugin from the package.json file.
   *
   * This method reads the package.json file located in the parent directory,
   * parses its content to extract the version, and logs the version using the debug logger.
   * The extracted version is then assigned to the `version` property of the class.
   *
   * @returns {Promise<void>} A promise that resolves when the version has been retrieved and logged.
   */
  async getVersion(): Promise<void> {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
    this.debugLog(`Plugin Version: ${version}`)
    this.version = version
  }

  /**
   * Validate and clean a string value for a Name Characteristic.
   * @param displayName - The display name of the accessory.
   * @param name - The name of the characteristic.
   * @param value - The value to be validated and cleaned.
   * @returns The cleaned string value.
   */
  async validateAndCleanDisplayName(displayName: string, name: string, value: string): Promise<string> {
    if (this.config.options?.allowInvalidCharacters) {
      return value
    } else {
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
