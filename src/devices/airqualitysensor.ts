/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * airqualitysensor.ts: homebridge-air.
 */
import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'

import type { AirPlatform } from '../platform.js'
import type { AirQualityDataArray, devicesConfig } from '../settings.js'

import { interval } from 'rxjs'
import { skipWhile } from 'rxjs/operators'
import striptags from 'striptags'
import { request } from 'undici'

import { AirNowUrl } from '../settings.js'
import { deviceBase } from './device.js'

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AirQualitySensor extends deviceBase {
  // Service
  private AirQualitySensor!: {
    Service: Service
    Name: CharacteristicValue
    AirQuality: CharacteristicValue
    OzoneDensity: CharacteristicValue
    NitrogenDioxideDensity: CharacteristicValue
    SulphurDioxideDensity: CharacteristicValue
    PM2_5Density: CharacteristicValue
    PM10Density: CharacteristicValue
    CarbonMonoxideLevel: CharacteristicValue
    StatusFault: CharacteristicValue
  }

  // Updates
  SensorUpdateInProgress!: boolean
  deviceStatus!: AirQualityDataArray

  constructor(
    readonly platform: AirPlatform,
    accessory: PlatformAccessory,
    device: devicesConfig,
  ) {
    super(platform, accessory, device)

    // AirQuality Sensor Service
    this.debugLog('Configure AirQuality Sensor Service')
    accessory.context.AirQualitySensor = accessory.context.AirQualitySensor ?? {}
    this.AirQualitySensor = {
      Name: this.accessory.displayName,
      Service: this.accessory.getService(this.hap.Service.AirQualitySensor) ?? this.accessory.addService(this.hap.Service.AirQualitySensor),
      AirQuality: accessory.context.AirQuality ?? this.hap.Characteristic.AirQuality.EXCELLENT,
      StatusFault: accessory.context.StatusFault ?? this.hap.Characteristic.StatusFault.NO_FAULT,
      OzoneDensity: accessory.context.OzoneDensity ?? 0,
      NitrogenDioxideDensity: accessory.context.NitrogenDioxideDensity ?? 0,
      SulphurDioxideDensity: accessory.context.SulphurDioxideDensity ?? 0,
      PM2_5Density: accessory.context.PM2_5Density ?? 0,
      PM10Density: accessory.context.PM10Density ?? 0,
      CarbonMonoxideLevel: accessory.context.CarbonMonoxideLevel ?? 0,
    }
    accessory.context.AirQualitySensor = this.AirQualitySensor as object

    // Add AirQuality Sensor Service's Characteristics
    this.AirQualitySensor.Service.setCharacteristic(this.hap.Characteristic.Name, this.AirQualitySensor.Name)

    // this is subject we use to track when we need to POST changes to the Air API
    this.SensorUpdateInProgress = false

    // Retrieve initial values and updateHomekit
    this.refreshStatus()
    this.updateHomeKitCharacteristics()

    // Start an update interval
    interval(this.deviceRefreshRate * 1000)
      .pipe(skipWhile(() => this.SensorUpdateInProgress))
      .subscribe(async () => {
        await this.refreshStatus()
      })
  }

  /**
   * Parse the device status from the Air api
   */
  async parseStatus() {
    let aqi = 0
    if (typeof this.deviceStatus[0] === 'undefined') {
      this.errorLog('AirNow air quality Configuration Error - Invalid ZipCode for %s.', this.device.provider)
      this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
    } else if (typeof this.deviceStatus[0].AQI === 'undefined') {
      this.errorLog('AirNow air quality Observation Error - %s for %s.', striptags(JSON.stringify(this.deviceStatus)), this.device.provider)
      this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
    } else {
      for (const key in this.deviceStatus) {
        switch (this.deviceStatus[key].ParameterName) {
          case 'O3':
            this.AirQualitySensor.OzoneDensity = Number.parseFloat(this.deviceStatus[key].AQI.toString())
            break
          case 'PM2.5':
            this.AirQualitySensor.PM2_5Density = Number.parseFloat(this.deviceStatus[key].AQI.toString())
            break
          case 'PM10':
            this.AirQualitySensor.PM10Density = Number.parseFloat(this.deviceStatus[key].AQI.toString())
            break
        }
        aqi = Math.max(0, Number.parseFloat(this.deviceStatus[key].AQI.toString())) // AirNow.gov defaults to MAX returned observation.
      }
      this.infoLog(`AirNow air quality AQI is: ${aqi.toString()}`)
      this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.NO_FAULT
    }
  }

  /**
   * Asks the Air API for the latest device information
   */
  async refreshStatus() {
    try {
      const { body, statusCode } = await request(`${AirNowUrl}&zipCode=${this.device.zipCode}&distance=${this.device.distance}&API_KEY=${this.device.apiKey}`)
      const response = await body.json() as AirQualityDataArray
      await this.debugWarnLog(`statusCode: ${JSON.stringify(statusCode)}`)
      await this.debugLog(`respsonse: ${JSON.stringify(response)}`)
      if (statusCode !== 200) {
        this.errorLog('AirNow air quality Network or Unknown Error from %s.', this.device.provider)
        this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
        await this.debugLog(`Error: ${JSON.stringify(response)}`)
        await this.apiError(response)
      } else {
        this.deviceStatus = response
        await this.parseStatus()
      }
      await this.updateHomeKitCharacteristics()
    } catch (e: any) {
      await this.errorLog(`failed to update status, Error Message: ${JSON.stringify(e.message)}`)
      await this.debugLog(`Error: ${JSON.stringify(e)}`)
      await this.apiError(e)
    }
  }

  /**
   * Updates the status for each of the HomeKit Characteristics
   */
  async updateHomeKitCharacteristics(): Promise<void> {
    if (this.AirQualitySensor.AirQuality === undefined) {
      await this.debugLog(`AirQuality: ${this.AirQualitySensor.AirQuality}`)
    } else {
      this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.AirQuality, this.AirQualitySensor.AirQuality)
      await this.debugLog(`updateCharacteristic AirQuality: ${this.AirQualitySensor.AirQuality}`)
    }
    if (this.AirQualitySensor.OzoneDensity === undefined) {
      await this.debugLog(`OzoneDensity: ${this.AirQualitySensor.OzoneDensity}`)
    } else {
      this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.OzoneDensity, this.AirQualitySensor.OzoneDensity)
      await this.debugLog(`updateCharacteristic OzoneDensity: ${this.AirQualitySensor.OzoneDensity}`)
    }
    if (this.AirQualitySensor.NitrogenDioxideDensity === undefined) {
      await this.debugLog(`NitrogenDioxideDensity: ${this.AirQualitySensor.NitrogenDioxideDensity}`)
    } else {
      this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.NitrogenDioxideDensity, this.AirQualitySensor.NitrogenDioxideDensity)
      await this.debugLog(`updateCharacteristic NitrogenDioxideDensity: ${this.AirQualitySensor.NitrogenDioxideDensity}`)
    }
    if (this.AirQualitySensor.SulphurDioxideDensity === undefined) {
      await this.debugLog(`SulphurDioxideDensity: ${this.AirQualitySensor.SulphurDioxideDensity}`)
    } else {
      this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.SulphurDioxideDensity, this.AirQualitySensor.SulphurDioxideDensity)
      await this.debugLog(`updateCharacteristic SulphurDioxideDensity: ${this.AirQualitySensor.SulphurDioxideDensity}`)
    }
    if (this.AirQualitySensor.PM2_5Density === undefined) {
      await this.debugLog(`PM2_5Density: ${this.AirQualitySensor.PM2_5Density}`)
    } else {
      this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.PM2_5Density, this.AirQualitySensor.PM2_5Density)
      await this.debugLog(`updateCharacteristic PM2_5Density: ${this.AirQualitySensor.PM2_5Density}`)
    }
    if (this.AirQualitySensor.PM10Density === undefined) {
      await this.debugLog(`PM10Density: ${this.AirQualitySensor.PM10Density}`)
    } else {
      this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.PM10Density, this.AirQualitySensor.PM10Density)
      await this.debugLog(`updateCharacteristic PM10Density: ${this.AirQualitySensor.PM10Density}`)
    }
    if (this.AirQualitySensor.CarbonMonoxideLevel === undefined) {
      await this.debugLog(`CarbonMonoxideLevel: ${this.AirQualitySensor.CarbonMonoxideLevel}`)
    } else {
      this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.CarbonMonoxideLevel, this.AirQualitySensor.CarbonMonoxideLevel)
      await this.debugLog(`updateCharacteristic CarbonMonoxideLevel: ${this.AirQualitySensor.CarbonMonoxideLevel}`)
    }
    if (this.AirQualitySensor.StatusFault === undefined) {
      await this.debugLog(`StatusFault: ${this.AirQualitySensor.StatusFault}`)
    } else {
      this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.StatusFault, this.AirQualitySensor.StatusFault)
      await this.debugLog(`updateCharacteristic StatusFault: ${this.AirQualitySensor.StatusFault}`)
    }
  }

  public async apiError(e: any): Promise<void> {
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.AirQuality, e)
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.OzoneDensity, e)
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.NitrogenDioxideDensity, e)
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.SulphurDioxideDensity, e)
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.PM2_5Density, e)
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.PM10Density, e)
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.CarbonMonoxideLevel, e)
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.StatusFault, this.hap.Characteristic.StatusFault.GENERAL_FAULT)
  }
}
