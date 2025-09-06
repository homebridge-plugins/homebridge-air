/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * server.ts: @homebridge-plugins/homebridge-air.
 */
import fs from 'node:fs'

import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils'

import { PLUGIN_NAME } from '../settings.js'

class PluginUiServer extends HomebridgePluginUiServer {
  constructor() {
    super()

    /*
      A native method getCachedAccessories() was introduced in config-ui-x v4.37.0
      The following is for users who have a lower version of config-ui-x
    */
    this.onRequest('getCachedAccessories', () => {
      try {
        const plugin = PLUGIN_NAME ?? '@homebridge-plugins/homebridge-air'
        const devicesToReturn = []

        // The path and file of the cached accessories
        const accFile = `${this.homebridgeStoragePath}/accessories/cachedAccessories`

        // Check the file exists
        if (fs.existsSync(accFile)) {
          // read the cached accessories file
          const cachedAccessories: any[] = JSON.parse(fs.readFileSync(accFile, 'utf8'))

          cachedAccessories.forEach((accessory: any) => {
            // Check the accessory is from this plugin
            if (accessory.plugin === plugin) {
              // Add the cached accessory to the array
              devicesToReturn.push(accessory.accessory as never)
            }
          })
        }
        // Return the array
        return devicesToReturn
      } catch {
        // Just return an empty accessory list in case of any errors
        return []
      }
    })

    // API key validation endpoint
    this.onRequest('testApiKey', async (body) => {
      return await this.testApiKeyConnection(body)
    })

    // Configuration validation endpoint
    this.onRequest('validateConfig', async (body) => {
      return await this.validateConfiguration(body)
    })

    // Get configuration suggestions
    this.onRequest('getConfigSuggestions', async (body) => {
      return await this.getConfigurationSuggestions(body)
    })

    this.ready()
  }

  /**
   * Test API key connectivity
   */
  private async testApiKeyConnection(body: any): Promise<any> {
    const { provider, apiKey, latitude, longitude, city, zipCode } = body

    if (!provider || !apiKey) {
      throw new RequestError('Provider and API key are required', 400)
    }

    try {
      let testUrl = ''
      const headers: Record<string, string> = {}

      if (provider === 'airnow') {
        // Test AirNow API
        if (zipCode) {
          testUrl = `https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=${zipCode}&distance=25&API_KEY=${apiKey}`
        } else if (latitude && longitude) {
          testUrl = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${latitude}&longitude=${longitude}&distance=25&API_KEY=${apiKey}`
        } else {
          throw new RequestError('Location (ZIP code or coordinates) required for AirNow', 400)
        }
      } else if (provider === 'aqicn') {
        // Test AQICN API
        if (city) {
          testUrl = `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${apiKey}`
        } else if (latitude && longitude) {
          testUrl = `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${apiKey}`
        } else {
          throw new RequestError('Location (city or coordinates) required for AQICN', 400)
        }
      } else {
        throw new RequestError('Unsupported provider', 400)
      }

      // Make test request
      const response = await fetch(testUrl, { headers })
      const data = await response.json()

      if (!response.ok) {
        throw new RequestError(`API test failed: ${response.status} ${response.statusText}`, response.status)
      }

      // Validate response based on provider
      if (provider === 'airnow') {
        if (!Array.isArray(data) || data.length === 0) {
          throw new RequestError('No air quality data available for this location', 404)
        }
        return {
          success: true,
          message: 'API key is valid and data is available',
          dataPreview: {
            location: data[0]?.ReportingArea || 'Unknown',
            aqi: data[0]?.AQI || 'N/A',
            parameter: data[0]?.ParameterName || 'N/A',
          },
        }
      } else if (provider === 'aqicn') {
        if (data.status !== 'ok') {
          throw new RequestError(`AQICN API error: ${data.data || 'Unknown error'}`, 400)
        }
        return {
          success: true,
          message: 'API key is valid and data is available',
          dataPreview: {
            location: data.data?.city?.name || 'Unknown',
            aqi: data.data?.aqi || 'N/A',
            station: data.data?.city?.url || 'N/A',
          },
        }
      }

      return { success: true, message: 'API key test completed' }
    } catch (error: any) {
      if (error instanceof RequestError) {
        throw error
      }
      throw new RequestError(`API test failed: ${error.message}`, 500)
    }
  }

  /**
   * Validate plugin configuration
   */
  private async validateConfiguration(body: any): Promise<any> {
    const config = body.config

    if (!config || typeof config !== 'object') {
      throw new RequestError('Invalid configuration format', 400)
    }

    const validationResults: any = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    }

    // Validate devices array
    if (!config.devices || !Array.isArray(config.devices)) {
      validationResults.errors.push('Devices array is required')
      validationResults.isValid = false
    } else {
      config.devices.forEach((device: any, index: number) => {
        this.validateDevice(device, index, validationResults)
      })
    }

    // Validate global settings
    if (config.refreshRate && (typeof config.refreshRate !== 'number' || config.refreshRate < 1800)) {
      validationResults.warnings.push('Refresh rate should be at least 1800 seconds (30 minutes)')
    }

    return validationResults
  }

  /**
   * Validate individual device configuration
   */
  private validateDevice(device: any, index: number, results: any): void {
    const devicePrefix = `Device ${index + 1}`

    // Required fields
    if (!device.provider) {
      results.errors.push(`${devicePrefix}: Provider is required`)
      results.isValid = false
    } else if (!['airnow', 'aqicn'].includes(device.provider)) {
      results.errors.push(`${devicePrefix}: Invalid provider "${device.provider}"`)
      results.isValid = false
    }

    if (!device.apiKey) {
      results.errors.push(`${devicePrefix}: API key is required`)
      results.isValid = false
    } else if (device.apiKey.length < 10) {
      results.warnings.push(`${devicePrefix}: API key seems unusually short`)
    }

    // Location validation
    const hasCoords = device.latitude && device.longitude
    const hasLocation = device.city || device.zipCode

    if (!hasCoords && !hasLocation) {
      results.errors.push(`${devicePrefix}: Either coordinates (lat/lng) or location (city/ZIP) is required`)
      results.isValid = false
    }

    // Coordinate validation
    if (device.latitude && (typeof device.latitude !== 'number' || device.latitude < -90 || device.latitude > 90)) {
      results.errors.push(`${devicePrefix}: Latitude must be between -90 and 90`)
      results.isValid = false
    }

    if (device.longitude && (typeof device.longitude !== 'number' || device.longitude < -180 || device.longitude > 180)) {
      results.errors.push(`${devicePrefix}: Longitude must be between -180 and 180`)
      results.isValid = false
    }

    // Provider-specific validation
    if (device.provider === 'airnow' && !device.zipCode && !hasCoords) {
      results.warnings.push(`${devicePrefix}: AirNow works best with ZIP codes for U.S. locations`)
    }

    if (device.provider === 'aqicn' && !device.city && !hasCoords) {
      results.warnings.push(`${devicePrefix}: AQICN works best with city names`)
    }
  }

  /**
   * Get configuration suggestions based on location or provider
   */
  private async getConfigurationSuggestions(body: any): Promise<any> {
    const { provider, location } = body

    const suggestions: any = {
      provider: [],
      settings: [],
      tips: [],
    }

    // Provider-specific suggestions
    if (provider === 'airnow') {
      suggestions.settings.push({
        key: 'refreshRate',
        value: 3600,
        reason: 'AirNow data updates hourly',
      })
      suggestions.tips.push('AirNow provides the most accurate data for U.S. locations')
      suggestions.tips.push('Use ZIP codes for best results with AirNow')
    } else if (provider === 'aqicn') {
      suggestions.settings.push({
        key: 'refreshRate',
        value: 1800,
        reason: 'AQICN data updates every 30 minutes',
      })
      suggestions.tips.push('AQICN provides global coverage with good international support')
      suggestions.tips.push('City names work well with AQICN')
    }

    // Location-based suggestions
    if (location?.country === 'US') {
      if (provider !== 'airnow') {
        suggestions.provider.push({
          name: 'airnow',
          reason: 'AirNow is recommended for U.S. locations',
        })
      }
    } else {
      if (provider !== 'aqicn') {
        suggestions.provider.push({
          name: 'aqicn',
          reason: 'AQICN is recommended for international locations',
        })
      }
    }

    return suggestions
  }
}

function startPluginUiServer(): PluginUiServer {
  return new PluginUiServer()
}

startPluginUiServer()
