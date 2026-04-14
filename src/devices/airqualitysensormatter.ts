/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * airqualitysensormatter.ts: @homebridge-plugins/homebridge-air.
 */
import type { AirMatterPlatform } from '../AirMatterPlatform.js'
import type { AirNowAirQualityDataArray, AqicnData, devicesConfig } from '../settings.js'

import { interval } from 'rxjs'
import { skipWhile } from 'rxjs/operators'
import { request } from 'undici'

import { AirNowUrl, AqicnUrl, HomeKitAQI, REQUEST_TIMEOUT_CONFIG } from '../settings.js'

/**
 * AirQualitySensorMatter
 *
 * Handles periodic AQI data fetching for a single Air Quality sensor registered
 * as a Matter accessory. On each polling cycle it fetches from the same provider
 * URLs used by the HAP AirQualitySensor class, converts the raw AQI value to a
 * HomeKit-level integer (1-5), and delegates to
 * {@link AirMatterPlatform.updateMatterAirQuality} which maps it to the Matter
 * `AirQualityEnum` (0-6) before pushing the state update to Homebridge.
 */
export class AirQualitySensorMatter {
  private updateInProgress = false
  private lastRequestTime = 0
  private lastAqi: number | null = null
  private readonly cacheMaxAge = 600000 // 10 minutes (same as HAP class)
  private apiCallCount = 0
  private apiCallResetTime = Date.now() + 3600000 // reset counter every hour

  constructor(
    private readonly platform: AirMatterPlatform,
    private readonly device: devicesConfig,
    private readonly uuid: string,
  ) {
    const refreshRate = device.refreshRate ?? platform.platformRefreshRate ?? 3600

    // Fetch immediately on creation (non-blocking)
    void this.refreshStatus()

    // Start polling interval
    interval(refreshRate * 1000)
      .pipe(skipWhile(() => this.updateInProgress))
      .subscribe(async () => {
        await this.refreshStatus()
      })
  }

  /**
   * Fetch the latest AQI data from the provider and push the result to the
   * registered Matter accessory state.
   */
  async refreshStatus(): Promise<void> {
    if (this.updateInProgress) {
      return
    }
    this.updateInProgress = true

    try {
      const currentTime = Date.now()

      // Return cached value if still fresh
      if (this.lastAqi !== null && (currentTime - this.lastRequestTime) < this.cacheMaxAge) {
        const cacheAge = Math.round((currentTime - this.lastRequestTime) / 1000)
        this.platform.log.debug(`[${this.device.city}] Matter: using cached AQI (${cacheAge}s old)`)
        await this.platform.updateMatterAirQuality(this.uuid, this.lastAqi)
        return
      }

      // Reset hourly call counter
      if (currentTime > this.apiCallResetTime) {
        this.apiCallCount = 0
        this.apiCallResetTime = currentTime + 3600000
      }

      // Honour rate limit (same 60 calls/hour as HAP class)
      const maxCallsPerHour = 60
      if (this.apiCallCount >= maxCallsPerHour) {
        if (this.lastAqi !== null) {
          await this.platform.updateMatterAirQuality(this.uuid, this.lastAqi)
        }
        return
      }
      this.apiCallCount++

      const url = this.buildUrl()
      if (!url) {
        this.platform.log.error(`[${this.device.city}] Matter: unknown air quality provider '${this.device.provider}'`)
        return
      }

      const { body, statusCode } = await request(url, {
        headersTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
        bodyTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
      })

      if (statusCode !== 200) {
        this.platform.log.error(`[${this.device.city}] Matter: ${this.device.provider} API returned status ${statusCode}`)
        return
      }

      const responseText = await body.text()
      if (!responseText || responseText.trim().length === 0) {
        this.platform.log.error(`[${this.device.city}] Matter: empty response from ${this.device.provider}`)
        return
      }

      let response: unknown
      try {
        response = JSON.parse(responseText)
      } catch {
        this.platform.log.error(`[${this.device.city}] Matter: failed to parse JSON response from ${this.device.provider}`)
        return
      }

      const aqi = this.parseAqi(response)
      if (aqi !== null) {
        this.lastAqi = aqi
        this.lastRequestTime = Date.now()
        await this.platform.updateMatterAirQuality(this.uuid, aqi)
        this.platform.log.info(`[${this.device.city}] Matter: air quality updated (HomeKit AQI ${aqi})`)
      }
    } catch (e: any) {
      this.platform.log.error(`[${this.device.city}] Matter: refresh failed – ${e?.message ?? e}`)
    } finally {
      this.updateInProgress = false
    }
  }

  /**
   * Build the provider API URL using the same logic as AirQualitySensor.refreshStatus.
   */
  private buildUrl(): string | undefined {
    const airNowBy = this.device.latitude && this.device.longitude ? 'latLong' : 'zipCode'

    let aqicnBy: string
    if (this.device.latitude && this.device.longitude) {
      aqicnBy = `geo:${this.device.latitude};${this.device.longitude}`
    } else if (
      this.device.city?.startsWith('/')
      || this.device.city?.includes('/city/')
      || this.device.city?.includes('/station/')
    ) {
      aqicnBy = this.device.city.startsWith('/') ? this.device.city.substring(1) : this.device.city
    } else {
      aqicnBy = this.device.city || ''
    }

    const airNowByValue = this.device.latitude && this.device.longitude
      ? `latitude=${this.device.latitude}&longitude=${this.device.longitude}`
      : `zipCode=${this.device.zipCode}`

    const distance = this.device.distance || '25'

    const urls: Record<string, string> = {
      airnow: `${AirNowUrl}${airNowBy}/current/?format=application/json&${airNowByValue}&distance=${distance}&API_KEY=${this.device.apiKey}`,
      aqicn: `${AqicnUrl}${aqicnBy}${aqicnBy ? '/' : ''}?token=${this.device.apiKey}`,
    }

    return urls[this.device.provider]
  }

  /**
   * Extract the overall AQI from the raw API response and convert it to a
   * HomeKit AQI level (1-5) using the shared HomeKitAQI helper.
   */
  private parseAqi(response: unknown): number | null {
    try {
      if (this.device.provider === 'aqicn') {
        const data = (response as AqicnData).data
        if (!data || (data.aqi !== 0 && !data.aqi)) {
          return null
        }
        return HomeKitAQI(Math.max(0, data.aqi))
      }

      if (this.device.provider === 'airnow') {
        const records = response as AirNowAirQualityDataArray
        if (!Array.isArray(records) || records.length === 0) {
          return null
        }
        const values = records.map(r => r.AQI).filter(v => typeof v === 'number' && !Number.isNaN(v))
        if (values.length === 0) {
          return null
        }
        return HomeKitAQI(Math.max(0, Math.max(...values)))
      }

      return null
    } catch {
      return null
    }
  }
}
