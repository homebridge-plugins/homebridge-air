/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * device.ts: homebridge-air.
 */
import type { API, CharacteristicValue, HAP, Logging, PlatformAccessory, Service } from 'homebridge'

import type { AirPlatform } from '../platform.js'
import type { AirPlatformConfig, devicesConfig } from '../settings.js'

export abstract class deviceBase {
  public readonly api: API
  public readonly log: Logging
  public readonly config!: AirPlatformConfig
  protected readonly hap: HAP

  // Config
  protected deviceLogging!: string
  protected deviceRefreshRate!: number

  constructor(
    protected readonly platform: AirPlatform,
    protected accessory: PlatformAccessory,
    protected device: devicesConfig,
  ) {
    this.api = this.platform.api
    this.log = this.platform.log
    this.config = this.platform.config
    this.hap = this.api.hap

    this.getDeviceLogSettings(accessory, device)
    this.getDeviceRateSettings(accessory, device)
    this.getDeviceConfigSettings(accessory, device)
    this.getDeviceContext(accessory, device)

    // Set accessory information
    accessory
      .getService(this.hap.Service.AccessoryInformation)!
      .setCharacteristic(this.hap.Characteristic.Manufacturer, 'AirNow')
      .setCharacteristic(this.hap.Characteristic.Name, accessory.displayName)
      .setCharacteristic(this.hap.Characteristic.ConfiguredName, accessory.displayName)
      .setCharacteristic(this.hap.Characteristic.Model, accessory.context.model)
      .setCharacteristic(this.hap.Characteristic.SerialNumber, accessory.context.serialNumber)
      .setCharacteristic(this.hap.Characteristic.FirmwareRevision, accessory.context.FirmwareRevision)
      .getCharacteristic(this.hap.Characteristic.FirmwareRevision)
      .updateValue(accessory.context.FirmwareRevision)
  }

  async getDeviceLogSettings(accessory: PlatformAccessory, device: devicesConfig): Promise<void> {
    this.deviceLogging = this.platform.debugMode ? 'debugMode' : device.logging ?? this.platform.platformLogging ?? 'standard'
    const logging = this.platform.debugMode ? 'Debug Mode' : device.logging ? 'Device Config' : this.platform.platformLogging ? 'Platform Config' : 'Default'
    accessory.context.deviceLogging = this.deviceLogging
    await this.debugLog(`Using ${logging} Logging: ${this.deviceLogging}`)
  }

  async getDeviceRateSettings(accessory: PlatformAccessory, device: devicesConfig): Promise<void> {
    // refreshRate
    this.deviceRefreshRate = device.refreshRate ?? this.platform.platformRefreshRate ?? 3600
    accessory.context.deviceRefreshRate = this.deviceRefreshRate
    const refreshRate = device.refreshRate ? 'Device Config' : this.platform.platformRefreshRate ? 'Platform Config' : 'Default'
    await this.debugLog(`Using ${refreshRate} Refresh Rate: ${this.deviceRefreshRate}`)
  }

  async getDeviceConfigSettings(accessory: PlatformAccessory, device: devicesConfig): Promise<void> {
    const deviceConfig = {}
    const properties = [
      'logging',
      'refreshRate',
      'delete',
    ]
    properties.forEach((prop) => {
      if (device[prop] !== undefined) {
        deviceConfig[prop] = device[prop]
      }
    })
    if (Object.keys(deviceConfig).length !== 0) {
      this.infoLog(`Config: ${JSON.stringify(deviceConfig)}`)
    }
    accessory.context.deviceConfig = deviceConfig
  }

  async getDeviceContext(accessory: PlatformAccessory, device: devicesConfig): Promise<void> {
    const deviceFirmwareVersion = device.firmware ?? accessory.context.version ?? this.platform.version ?? '0.0.0'
    const version = deviceFirmwareVersion.toString()
    this.debugLog(`Firmware Version: ${version.replace(/^V|-.*$/g, '')}`)
    let deviceVersion: string
    if (version?.includes('.') === false) {
      const replace = version?.replace(/^V|-.*$/g, '')
      const match = replace?.match(/./g)
      const validVersion = match?.join('.')
      deviceVersion = validVersion ?? '0.0.0'
    } else {
      deviceVersion = version.replace(/^V|-.*$/g, '') ?? '0.0.0'
    }
    accessory
      .getService(this.hap.Service.AccessoryInformation)!
      .setCharacteristic(this.hap.Characteristic.HardwareRevision, deviceVersion)
      .setCharacteristic(this.hap.Characteristic.SoftwareRevision, deviceVersion)
      .setCharacteristic(this.hap.Characteristic.FirmwareRevision, deviceVersion)
      .getCharacteristic(this.hap.Characteristic.FirmwareRevision)
      .updateValue(deviceVersion)
    accessory.context.FirmwareRevision = deviceVersion
    this.debugSuccessLog(`FirmwareRevision: ${accessory.context.version}`)
  }

  /**
   * Update the characteristic value and log the change.
   *
   * @param Service Service
   * @param Characteristic Characteristic
   * @param CharacteristicValue CharacteristicValue | undefined
   * @param CharacteristicName string
   * @return: void
   *
   */
  async updateCharacteristic(Service: Service, Characteristic: any, CharacteristicValue: CharacteristicValue | undefined, CharacteristicName: string): Promise<void> {
    if (CharacteristicValue === undefined) {
      this.debugLog(`${CharacteristicName}: ${CharacteristicValue}`)
    } else {
      Service.updateCharacteristic(Characteristic, CharacteristicValue)
      this.debugLog(`updateCharacteristic ${CharacteristicName}: ${CharacteristicValue}`)
      this.debugWarnLog(`${CharacteristicName} context before: ${this.accessory.context[CharacteristicName]}`)
      this.accessory.context[CharacteristicName] = CharacteristicValue
      this.debugWarnLog(`${CharacteristicName} context after: ${this.accessory.context[CharacteristicName]}`)
    }
  }

  /**
   * Logging for Device
   */
  async infoLog(...log: any[]): Promise<void> {
    if (await this.enablingDeviceLogging()) {
      this.log.info(`${this.accessory.displayName}`, String(...log))
    }
  }

  async successLog(...log: any[]): Promise<void> {
    if (await this.enablingDeviceLogging()) {
      this.log.success(`${this.accessory.displayName}`, String(...log))
    }
  }

  async debugSuccessLog(...log: any[]): Promise<void> {
    if (await this.enablingDeviceLogging()) {
      if (await this.loggingIsDebug()) {
        this.log.success(`[DEBUG] ${this.accessory.displayName}`, String(...log))
      }
    }
  }

  async warnLog(...log: any[]): Promise<void> {
    if (await this.enablingDeviceLogging()) {
      this.log.warn(`${this.accessory.displayName}`, String(...log))
    }
  }

  async debugWarnLog(...log: any[]): Promise<void> {
    if (await this.enablingDeviceLogging()) {
      if (await this.loggingIsDebug()) {
        this.log.warn(`[DEBUG] ${this.accessory.displayName}`, String(...log))
      }
    }
  }

  async errorLog(...log: any[]): Promise<void> {
    if (await this.enablingDeviceLogging()) {
      this.log.error(`${this.accessory.displayName}`, String(...log))
    }
  }

  async debugErrorLog(...log: any[]): Promise<void> {
    if (await this.enablingDeviceLogging()) {
      if (await this.loggingIsDebug()) {
        this.log.error(`[DEBUG] ${this.accessory.displayName}`, String(...log))
      }
    }
  }

  async debugLog(...log: any[]): Promise<void> {
    if (await this.enablingDeviceLogging()) {
      if (this.deviceLogging === 'debug') {
        this.log.info(`[DEBUG] ${this.accessory.displayName}`, String(...log))
      } else if (this.deviceLogging === 'debugMode') {
        this.log.debug(`${this.accessory.displayName}`, String(...log))
      }
    }
  }

  async loggingIsDebug(): Promise<boolean> {
    return this.deviceLogging === 'debugMode' || this.deviceLogging === 'debug'
  }

  async enablingDeviceLogging(): Promise<boolean> {
    return this.deviceLogging === 'debugMode' || this.deviceLogging === 'debug' || this.deviceLogging === 'standard'
  }
}
