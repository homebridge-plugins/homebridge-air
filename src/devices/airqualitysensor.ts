/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * airqualitysensor.ts: @homebridge-plugins/homebridge-air.
 */
import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'

import type { AirPlatform } from '../platform.js'
import type { AirNowAirQualityDataArray, AqicnData, devicesConfig } from '../settings.js'

import { interval } from 'rxjs'
import { skipWhile } from 'rxjs/operators'
import striptags from 'striptags'
import { request } from 'undici'

import { AirNowUrl, AqicnUrl, HomeKitAQI } from '../settings.js'
import { deviceBase } from './device.js'

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AirQualitySensor extends deviceBase {
  // Service
  public AirQualitySensor!: {
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
  deviceStatus: any

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
    try {
      const provider = this.device.provider
      const status = provider === 'airnow' ? this.deviceStatus[0] : this.deviceStatus
      if (provider === 'airnow' && !status) {
        this.errorLog('AirNow air quality Configuration Error - Invalid ZipCode for %s.', provider)
        this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
      } else if (provider === 'airnow' && typeof status.AQI === 'undefined') {
        this.errorLog('AirNow air quality Observation Error - %s for %s.', striptags(JSON.stringify(this.deviceStatus)), provider)
        this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
      } else if (provider === 'aqicn' && (!this.deviceStatus || typeof this.deviceStatus.aqi === 'undefined')) {
        this.errorLog('AQICN air quality Data Error - Invalid response structure or missing AQI data for %s.', provider)
        await this.debugLog('AQICN response structure: %s', JSON.stringify(this.deviceStatus))
        this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
      } else if (provider === 'airnow' || provider === 'aqicn') {
        // Set the main AirQuality using the overall AQI value
        if (provider === 'aqicn') {
          // For AQICN, use the main aqi value for overall air quality
          const mainAqi = this.deviceStatus.aqi
          if (typeof mainAqi === 'number' && !Number.isNaN(mainAqi)) {
            this.AirQualitySensor.AirQuality = HomeKitAQI(Math.max(0, mainAqi))
            await this.debugLog(`${provider} main AQI: ${mainAqi} -> HomeKit category: ${this.AirQualitySensor.AirQuality}`)
          }
        }

        // Process individual pollutants for their specific density characteristics
        const pollutants = provider === 'airnow' ? ['O3', 'PM2.5', 'PM10'] : ['o3', 'no2', 'so2', 'pm25', 'pm10', 'co']
        let pollutantCount = 0
        for (const pollutant of pollutants) {
          const param = provider === 'airnow' ? this.deviceStatus.find((p: { ParameterName: string }) => p.ParameterName === pollutant) : this.deviceStatus.iaqi[pollutant]?.v
          if (param !== undefined) {
            const aqi = provider === 'airnow' ? Number.parseFloat(param.AQI.toString()) : Number.parseFloat(param.toString())
            if (!Number.isNaN(aqi)) {
              pollutantCount++
              await this.debugLog(`${provider} ${pollutant} AQI: ${aqi}`)
              switch (pollutant.toLowerCase()) {
                case 'o3':
                  this.AirQualitySensor.OzoneDensity = aqi
                  break
                case 'pm2.5':
                case 'pm25': // Handle both formats
                  this.AirQualitySensor.PM2_5Density = aqi
                  break
                case 'pm10':
                  this.AirQualitySensor.PM10Density = aqi
                  break
                case 'no2':
                  this.AirQualitySensor.NitrogenDioxideDensity = aqi
                  break
                case 'so2':
                  this.AirQualitySensor.SulphurDioxideDensity = aqi
                  break
                case 'co':
                  this.AirQualitySensor.CarbonMonoxideLevel = aqi
                  break
              }
              // For AirNow, set main AirQuality based on individual pollutant values (existing behavior)
              if (provider === 'airnow') {
                this.AirQualitySensor.AirQuality = HomeKitAQI(Math.max(0, aqi))
              }
            }
          } else {
            await this.debugLog(`${provider} ${pollutant} data not available`)
          }
        }

        if (pollutantCount === 0) {
          this.warnLog(`${provider} No pollutant data found in response. Available iaqi keys: ${provider === 'aqicn' ? JSON.stringify(Object.keys(this.deviceStatus.iaqi || {})) : 'N/A'}`)
        } else {
          this.infoLog(`${provider} air quality AQI is: ${this.AirQualitySensor.AirQuality} (${pollutantCount} pollutants found)`)
        }
        this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.NO_FAULT
      } else {
        await this.errorLog('Unknown air quality provider: %s.', provider)
      }
    } catch (e: any) {
      await this.errorLog(`failed to parseStatus, Error Message: ${JSON.stringify(e.message ?? e)}`)
      await this.apiError(e)
    }
  }

  /**
   * Asks the Air API for the latest device information
   */
  async refreshStatus() {
    try {
      const AirNowCurrentObservationBy = this.device.latitude && this.device.longitude ? `latLong` : 'zipCode'
      const AqicnCurrentObservationBy = this.device.latitude && this.device.longitude ? `geo:${this.device.latitude};${this.device.longitude}` : this.device.city
      const AirNowCurrentObservationByValue = this.device.latitude && this.device.longitude ? `latitude=${this.device.latitude}&longitude=${this.device.longitude}` : `zipCode=${this.device.zipCode}`
      const providerUrls = {
        airnow: `${AirNowUrl}${AirNowCurrentObservationBy}/current/?format=application/json&${AirNowCurrentObservationByValue}&distance=${this.device.distance}&API_KEY=${this.device.apiKey}`,
        aqicn: `${AqicnUrl}${AqicnCurrentObservationBy}/?token=${this.device.apiKey}`,
      }
      const url = providerUrls[this.device.provider]
      await this.debugSuccessLog(`url: ${JSON.stringify(url)}`)
      if (url) {
        const { body, statusCode } = await request(url)
        const response = await body.json()
        await this.debugWarnLog(`statusCode: ${JSON.stringify(statusCode)}`)
        await this.debugLog(`response: ${JSON.stringify(response)}`)

        if (statusCode !== 200) {
          this.errorLog(`${this.device.provider === 'airnow' ? 'AirNow' : 'World Air Quality Index'} air quality Network or Unknown Error from %s.`, this.device.provider)
          this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
          await this.debugLog(`Error: ${JSON.stringify(response)}`)
          await this.apiError(response)
        } else {
          if (this.device.provider === 'aqicn') {
            const aqicnResponse = response as AqicnData
            if (aqicnResponse.status !== 'ok' || !aqicnResponse.data) {
              await this.errorLog(`AQICN API Error - Status: ${aqicnResponse.status}`)
              this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
              await this.apiError(aqicnResponse)
              return
            }
            this.deviceStatus = aqicnResponse.data
          } else {
            this.deviceStatus = response as AirNowAirQualityDataArray
          }
          await this.parseStatus()
        }
      } else {
        await this.errorLog('Unknown air quality provider: %s.', this.device.provider)
      }
      await this.updateHomeKitCharacteristics()
    } catch (e: any) {
      // Improve error message handling to provide more useful debugging information
      const errorMessage = e?.message || e?.code || e?.name || 'Unknown error'
      const errorDetails = e?.stack ? ` Stack: ${e.stack}` : ''
      await this.errorLog(`failed to update status, Error Message: ${errorMessage}${errorDetails}`)

      // Log additional context for debugging
      // Limit error logging to key properties to avoid performance issues
      const limitedError = {
        message: e?.message,
        code: e?.code,
        name: e?.name,
        stack: e?.stack,
      }
      await this.debugLog(`Error object: ${JSON.stringify(limitedError)}`)
      await this.debugLog(`Provider: ${this.device.provider}, City: ${this.device.city || 'N/A'}`)

      await this.apiError(e)
    }
  }

  /**
   * Updates the status for each of the HomeKit Characteristics
   */
  async updateHomeKitCharacteristics(): Promise<void> {
    // AirQuality
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.AirQuality, this.AirQualitySensor.AirQuality, 'AirQuality')
    // OzoneDensity
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.OzoneDensity, this.AirQualitySensor.OzoneDensity, 'OzoneDensity')
    // NitrogenDioxideDensity
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.NitrogenDioxideDensity, this.AirQualitySensor.NitrogenDioxideDensity, 'NitrogenDioxideDensity')
    // SulphurDioxideDensity
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.SulphurDioxideDensity, this.AirQualitySensor.SulphurDioxideDensity, 'SulphurDioxideDensity')
    // PM2_5Density
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.PM2_5Density, this.AirQualitySensor.PM2_5Density, 'PM2_5Density')
    // PM10Density
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.PM10Density, this.AirQualitySensor.PM10Density, 'PM10Density')
    // CarbonMonoxideLevel
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.CarbonMonoxideLevel, this.AirQualitySensor.CarbonMonoxideLevel, 'CarbonMonoxideLevel')
    // StatusFault
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.StatusFault, this.AirQualitySensor.StatusFault, 'StatusFault')
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
