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

import { AirNowUrl, AqicnUrl, HomeKitAQI, REQUEST_TIMEOUT_CONFIG } from '../settings.js'
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

  // Track which pollutants have valid data to prevent unnecessary characteristic updates
  private availablePollutants: Set<string> = new Set()

  // Updates
  SensorUpdateInProgress!: boolean
  deviceStatus: any

  // Caching to follow AirNow best practices - observations update hourly
  // Cache for 10 minutes minimum (AirNow updates between 10-30 min past the hour)
  private lastRequestTime: number = 0
  private lastResponseData: AirNowAirQualityDataArray | AqicnData['data'] | null = null
  private readonly cacheMaxAge: number = 600000 // 10 minutes cache (600 seconds)
  private apiCallCount: number = 0
  private apiCallResetTime: number = Date.now() + 3600000 // Reset hourly

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

      // Clear previous pollutant availability tracking at the start
      this.availablePollutants.clear()

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
                  this.availablePollutants.add('OzoneDensity')
                  break
                case 'pm2.5':
                case 'pm25': // Handle both formats
                  this.AirQualitySensor.PM2_5Density = aqi
                  this.availablePollutants.add('PM2_5Density')
                  break
                case 'pm10':
                  this.AirQualitySensor.PM10Density = aqi
                  this.availablePollutants.add('PM10Density')
                  break
                case 'no2':
                  this.AirQualitySensor.NitrogenDioxideDensity = aqi
                  this.availablePollutants.add('NitrogenDioxideDensity')
                  break
                case 'so2':
                  this.AirQualitySensor.SulphurDioxideDensity = aqi
                  this.availablePollutants.add('SulphurDioxideDensity')
                  break
                case 'co':
                  this.AirQualitySensor.CarbonMonoxideLevel = aqi
                  this.availablePollutants.add('CarbonMonoxideLevel')
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
   * Reverse geocode lat/long to get zip code using Nominatim (OpenStreetMap)
   * This is used as a fallback when lat/long endpoint fails
   */
  async reverseGeocodeToZipCode(latitude: number, longitude: number): Promise<{ zipCode: string, city: string } | null> {
    try {
      await this.debugLog(`Attempting reverse geocoding for coordinates: ${latitude}, ${longitude}`)
      const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`

      const { body, statusCode } = await request(geocodeUrl, {
        headers: {
          'User-Agent': 'homebridge-air/1.0',
        },
        headersTimeout: 10000,
        bodyTimeout: 10000,
      })

      if (statusCode === 200) {
        const responseText = await body.text()
        const data = JSON.parse(responseText)

        if (data.address) {
          const zipCode = data.address.postcode
          const city = data.address.city || data.address.town || data.address.village || data.address.county

          if (zipCode && city) {
            await this.infoLog(`Reverse geocoding successful: ${city}, ZIP ${zipCode}`)
            return { zipCode, city }
          }
        }
      }

      await this.debugLog(`Reverse geocoding failed or incomplete data received`)
      return null
    } catch (error: any) {
      await this.debugLog(`Reverse geocoding error: ${error.message}`)
      return null
    }
  }

  /**
   * Asks the Air API for the latest device information
   */
  async refreshStatus() {
    try {
      // Check cache first to reduce API calls and follow AirNow best practices
      const currentTime = Date.now()
      if (this.lastResponseData && (currentTime - this.lastRequestTime) < this.cacheMaxAge) {
        const cacheAge = Math.round((currentTime - this.lastRequestTime) / 1000)
        await this.debugLog(`Using cached response (${cacheAge}s old, cache max: ${this.cacheMaxAge / 1000}s)`)
        this.deviceStatus = this.lastResponseData
        await this.parseStatus()
        await this.updateHomeKitCharacteristics()
        return
      }

      // Reset API call counter every hour (rate limiting per AirNow guidelines)
      if (currentTime > this.apiCallResetTime) {
        await this.debugLog(`Resetting API call counter (made ${this.apiCallCount} calls last hour)`)
        this.apiCallCount = 0
        this.apiCallResetTime = currentTime + 3600000 // Next hour
      }

      // Check rate limit (conservative limit to avoid issues)
      // AirNow recommends caching and limiting calls since observations update hourly
      const maxCallsPerHour = 60 // Conservative limit
      if (this.apiCallCount >= maxCallsPerHour) {
        const timeUntilReset = Math.round((this.apiCallResetTime - currentTime) / 60000)
        await this.warnLog(`API rate limit reached (${this.apiCallCount} calls). Using cached data. Resets in ${timeUntilReset} min`)
        if (this.lastResponseData) {
          this.deviceStatus = this.lastResponseData
          await this.parseStatus()
          await this.updateHomeKitCharacteristics()
        }
        return
      }

      // Increment API call counter
      this.apiCallCount++
      await this.debugLog(`API call ${this.apiCallCount}/${maxCallsPerHour} this hour`)

      // Use correct AirNow API endpoint paths from official docs
      // https://docs.airnowapi.org/CurrentObservationsByZip/docs
      // https://docs.airnowapi.org/CurrentObservationsByLatLon/docs
      const AirNowCurrentObservationBy = this.device.latitude && this.device.longitude ? `latLong` : 'zipCode'
      // Support flexible AQICN URL patterns: geo coordinates, city names, and full URL paths
      let AqicnCurrentObservationBy: string
      if (this.device.latitude && this.device.longitude) {
        // Use geo coordinates when available
        AqicnCurrentObservationBy = `geo:${this.device.latitude};${this.device.longitude}`
      } else if (this.device.city?.startsWith('/') || this.device.city?.includes('/city/') || this.device.city?.includes('/station/')) {
        // Support full URL paths like /city/country/cityname, /station/@stationid, /station/station-name/locale
        AqicnCurrentObservationBy = this.device.city.startsWith('/') ? this.device.city.substring(1) : this.device.city
      } else {
        // Default to simple city name for backward compatibility (empty string produces no extra path)
        AqicnCurrentObservationBy = this.device.city || ''
      }
      const AirNowCurrentObservationByValue = this.device.latitude && this.device.longitude ? `latitude=${this.device.latitude}&longitude=${this.device.longitude}` : `zipCode=${this.device.zipCode}`
      const distance = this.device.distance || '25' // Default distance of 25 miles if not specified
      // Use correct format as per official AirNow API docs
      const providerUrls = {
        airnow: `${AirNowUrl}${AirNowCurrentObservationBy}/current/?format=application/json&${AirNowCurrentObservationByValue}&distance=${distance}&API_KEY=${this.device.apiKey}`,
        aqicn: `${AqicnUrl}${AqicnCurrentObservationBy}${AqicnCurrentObservationBy ? '/' : ''}?token=${this.device.apiKey}`,
      }
      const url = providerUrls[this.device.provider]
      await this.debugSuccessLog(`url: ${JSON.stringify(url)}`)
      if (url) {
        const { body, statusCode, headers } = await request(url, {
          headersTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
          bodyTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
        })

        let response: any
        try {
          const responseText = await body.text()
          await this.debugLog(`Raw response (length: ${responseText.length}): ${responseText}`)
          await this.debugWarnLog(`statusCode: ${JSON.stringify(statusCode)}`)

          // Check for redirects (3xx status codes) - try fallback to zip code lookup
          if (statusCode >= 300 && statusCode < 400) {
            const location = headers.location
            await this.warnLog(`API returned redirect (${statusCode}). Location: ${location || 'not provided'}`)

            // If using lat/lon with AirNow, try reverse geocoding to get zip code as fallback
            if (this.device.provider === 'airnow' && this.device.latitude && this.device.longitude) {
              await this.infoLog(`Attempting reverse geocoding to find zip code as fallback...`)
              const geoData = await this.reverseGeocodeToZipCode(this.device.latitude, this.device.longitude)

              if (geoData?.zipCode) {
                await this.infoLog(`Found zip code ${geoData.zipCode} for ${geoData.city}. Retrying with zip code...`)
                // Temporarily update device config to use zip code
                const originalZipCode = this.device.zipCode
                this.device.zipCode = geoData.zipCode
                this.device.city = geoData.city

                // Build new URL with zip code
                const fallbackUrl = `${AirNowUrl}ByZipCode/current/?format=application/json&zipCode=${geoData.zipCode}&distance=${distance}&API_KEY=${this.device.apiKey}`
                await this.debugLog(`Fallback URL: ${fallbackUrl}`)

                try {
                  const fallbackResponse = await request(fallbackUrl, {
                    headersTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
                    bodyTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
                  })

                  const fallbackText = await fallbackResponse.body.text()
                  if (fallbackResponse.statusCode === 200 && fallbackText && fallbackText.trim().length > 0) {
                    response = JSON.parse(fallbackText)
                    await this.successLog(`Fallback to zip code successful! Using ${geoData.city}, ${geoData.zipCode}`)
                    // Process the successful response
                    this.deviceStatus = response
                    this.lastResponseData = response
                    this.lastRequestTime = Date.now()
                    await this.parseStatus()
                    await this.updateHomeKitCharacteristics()
                    return
                  } else {
                    await this.warnLog(`Fallback zip code lookup also failed (Status: ${fallbackResponse.statusCode})`)
                  }
                } catch (fallbackError: any) {
                  await this.debugLog(`Fallback zip code request failed: ${fallbackError.message}`)
                } finally {
                  // Restore original zip code if we had one
                  if (originalZipCode) {
                    this.device.zipCode = originalZipCode
                  }
                }
              } else {
                await this.warnLog(`Could not determine zip code from coordinates`)
              }
            }

            await this.errorLog(`The AirNow API endpoint may have changed or requires different parameters.`)
            await this.debugLog(`Try using zipCode in your config, or check if your API key is valid.`)
            this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
            return
          }

          if (!responseText || responseText.trim().length === 0) {
            // Try reverse geocoding fallback for empty responses too
            if (this.device.provider === 'airnow' && this.device.latitude && this.device.longitude && !this.device.zipCode) {
              await this.infoLog(`Empty response - attempting reverse geocoding fallback...`)
              const geoData = await this.reverseGeocodeToZipCode(this.device.latitude, this.device.longitude)

              if (geoData?.zipCode) {
                await this.infoLog(`Found zip code ${geoData.zipCode}. Retrying with zip code...`)
                this.device.zipCode = geoData.zipCode
                this.device.city = geoData.city

                const fallbackUrl = `${AirNowUrl}ByZipCode/current/?format=application/json&zipCode=${geoData.zipCode}&distance=${distance}&API_KEY=${this.device.apiKey}`

                try {
                  const fallbackResponse = await request(fallbackUrl, {
                    headersTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
                    bodyTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
                  })

                  const fallbackText = await fallbackResponse.body.text()
                  if (fallbackResponse.statusCode === 200 && fallbackText && fallbackText.trim().length > 0) {
                    response = JSON.parse(fallbackText)
                    await this.successLog(`Fallback to zip code successful! Will use ${geoData.city}, ${geoData.zipCode} going forward`)
                    this.deviceStatus = response
                    this.lastResponseData = response
                    this.lastRequestTime = Date.now()
                    await this.parseStatus()
                    await this.updateHomeKitCharacteristics()
                    return
                  }
                } catch (fallbackError: any) {
                  await this.debugLog(`Fallback zip code request failed: ${fallbackError.message}`)
                }
              }
            }

            await this.errorLog(`Empty response body received from ${this.device.provider} API (Status: ${statusCode})`)
            await this.errorLog(`This usually means no air quality data is available for your location.`)
            await this.errorLog(`Try adjusting the distance parameter or verify your coordinates are correct.`)
            await this.debugLog(`Current settings - Lat: ${this.device.latitude}, Lon: ${this.device.longitude}, Distance: ${distance}`)
            this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
            return
          }

          response = JSON.parse(responseText)
        } catch (parseError: any) {
          await this.errorLog(`Failed to parse JSON response from ${this.device.provider} API: ${parseError.message}`)
          await this.debugLog(`Parse error details: ${JSON.stringify({ code: parseError.code, name: parseError.name })}`)
          this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
          return
        }

        await this.debugLog(`response: ${JSON.stringify(response)}`)

        if (statusCode !== 200) {
          const errorMessage = `${this.device.provider === 'airnow' ? 'AirNow' : 'World Air Quality Index'} API returned status ${statusCode}`
          await this.errorLog(`${errorMessage} for provider %s.`, this.device.provider)
          this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
          await this.debugLog(`Error response: ${JSON.stringify(response)}`)
          await this.apiError(response)
        } else {
          // Validate response structure before processing
          if (!response) {
            await this.errorLog(`Empty response received from ${this.device.provider} API`)
            this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
            return
          }

          if (this.device.provider === 'aqicn') {
            const aqicnResponse = response as AqicnData
            if (aqicnResponse.status !== 'ok' || !aqicnResponse.data) {
              const statusMessage = aqicnResponse.status || 'unknown'
              await this.errorLog(`AQICN API Error - Status: ${statusMessage}`)
              this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
              await this.apiError(aqicnResponse)
              return
            }
            // Additional validation for AQICN data structure
            if (!aqicnResponse.data.aqi && aqicnResponse.data.aqi !== 0) {
              await this.errorLog(`AQICN API Error - Missing AQI data in response`)
              this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
              return
            }
            this.deviceStatus = aqicnResponse.data
            // Cache the successful response (following AirNow best practices for hourly updates)
            this.lastResponseData = aqicnResponse.data
            this.lastRequestTime = Date.now()
            await this.debugLog(`Data cached. Will reuse for ${this.cacheMaxAge / 1000}s (AirNow updates hourly)`)
          } else {
            // Validate AirNow response structure
            const airnowResponse = response as AirNowAirQualityDataArray
            if (!Array.isArray(airnowResponse) || airnowResponse.length === 0) {
              await this.errorLog(`AirNow API Error - Invalid response structure or empty data`)
              this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
              return
            }
            this.deviceStatus = airnowResponse
            // Cache the successful response (following AirNow best practices for hourly updates)
            this.lastResponseData = airnowResponse
            this.lastRequestTime = Date.now()
            await this.debugLog(`Data cached. Will reuse for ${this.cacheMaxAge / 1000}s (AirNow updates hourly)`)
            this.lastRequestTime = Date.now()
          }
          await this.parseStatus()
        }
      } else {
        await this.errorLog('Unknown air quality provider: %s.', this.device.provider)
      }
      await this.updateHomeKitCharacteristics()
    } catch (e: any) {
      // Improve error message handling for different error types
      const errorMessage = e?.message || e?.code || e?.name || 'Unknown error'

      // Handle specific error types for better debugging
      if (e?.code === 'UND_ERR_CONNECT_TIMEOUT' || e?.code === 'ETIMEDOUT') {
        await this.errorLog(`API request timeout for ${this.device.provider} - check network connectivity`)
        this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
      } else if (e?.code === 'ENOTFOUND' || e?.code === 'ECONNREFUSED') {
        await this.errorLog(`Network error for ${this.device.provider} API - ${errorMessage}`)
        this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
      } else {
        await this.errorLog(`Failed to update status for ${this.device.provider}, Error: ${errorMessage}`)
        this.AirQualitySensor.StatusFault = this.hap.Characteristic.StatusFault.GENERAL_FAULT
      }

      // Log additional context for debugging (limit to avoid performance issues)
      const limitedError = {
        message: e?.message,
        code: e?.code,
        name: e?.name,
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
    // AirQuality (always available)
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.AirQuality, this.AirQualitySensor.AirQuality, 'AirQuality')

    // Only update characteristics for pollutants that have data available
    if (this.availablePollutants.has('OzoneDensity')) {
      await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.OzoneDensity, this.AirQualitySensor.OzoneDensity, 'OzoneDensity')
    }
    if (this.availablePollutants.has('NitrogenDioxideDensity')) {
      await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.NitrogenDioxideDensity, this.AirQualitySensor.NitrogenDioxideDensity, 'NitrogenDioxideDensity')
    }
    if (this.availablePollutants.has('SulphurDioxideDensity')) {
      await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.SulphurDioxideDensity, this.AirQualitySensor.SulphurDioxideDensity, 'SulphurDioxideDensity')
    }
    if (this.availablePollutants.has('PM2_5Density')) {
      await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.PM2_5Density, this.AirQualitySensor.PM2_5Density, 'PM2_5Density')
    }
    if (this.availablePollutants.has('PM10Density')) {
      await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.PM10Density, this.AirQualitySensor.PM10Density, 'PM10Density')
    }

    // Only update CarbonMonoxideLevel if CO data is available
    if (this.availablePollutants.has('CarbonMonoxideLevel')) {
      await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.CarbonMonoxideLevel, this.AirQualitySensor.CarbonMonoxideLevel, 'CarbonMonoxideLevel')
    }

    // StatusFault (always available)
    await this.updateCharacteristic(this.AirQualitySensor.Service, this.hap.Characteristic.StatusFault, this.AirQualitySensor.StatusFault, 'StatusFault')
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  public async apiError(_e: any): Promise<void> {
    // Set StatusFault to indicate an error state - don't set measurement characteristics to error objects
    this.AirQualitySensor.Service.updateCharacteristic(this.hap.Characteristic.StatusFault, this.hap.Characteristic.StatusFault.GENERAL_FAULT)
  }
}
