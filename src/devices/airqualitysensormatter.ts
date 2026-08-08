/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * airqualitysensormatter.ts: @homebridge-plugins/homebridge-air.
 */
import type { AirMatterPlatform } from '../AirMatterPlatform.js'
import type { AirNowAirQualityDataArray, AqicnData, devicesConfig } from '../settings.js'

import { interval } from 'rxjs'
import { skipWhile } from 'rxjs/operators'
import { Agent, request } from 'undici'

import {
  AirNowUrl,
  AqicnUrl,
  getAqicnError,
  HomeKitAQI,
  normaliseAqicnAqi,
  REQUEST_RATE_LIMIT_CONFIG,
  REQUEST_TIMEOUT_CONFIG,
  resolveAqicnLocationSegment,
} from '../settings.js'

const defaultApiAgent = new Agent({
  connect: {
    timeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
    autoSelectFamily: true,
    autoSelectFamilyAttemptTimeout: REQUEST_TIMEOUT_CONFIG.AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT,
  },
})

const noFamilyAutoSelectAgent = new Agent({
  connect: {
    timeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
    autoSelectFamily: false,
  },
})

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
  private readonly cacheMaxAge = REQUEST_RATE_LIMIT_CONFIG.CACHE_MAX_AGE
  private apiCallCount = 0
  private apiCallResetTime = Date.now() + REQUEST_RATE_LIMIT_CONFIG.CALL_WINDOW_MS

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
        this.apiCallResetTime = currentTime + REQUEST_RATE_LIMIT_CONFIG.CALL_WINDOW_MS
      }

      // Honour rate limit (same 60 calls/hour as HAP class)
      const maxCallsPerHour = REQUEST_RATE_LIMIT_CONFIG.MAX_CALLS_PER_WINDOW
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

      const { body, statusCode } = await this.executeApiRequestWithFallback(url)

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
    const aqicnBy = resolveAqicnLocationSegment(this.device)

    const airNowByValue = this.device.latitude && this.device.longitude
      ? `latitude=${this.device.latitude}&longitude=${this.device.longitude}`
      : `zipcode=${this.device.zipCode}`

    const distance = this.device.distance || '25'

    const urls: Record<string, string> = {
      airnow: `${AirNowUrl}current/ziplatlong/?format=application/json&${airNowByValue}&distance=${distance}&API_KEY=${this.device.apiKey}`,
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
        // Surface the real API reason (including errors AQICN nests inside data
        // under an 'ok' status) before trying to read a value (#7)
        const aqicnError = getAqicnError(response)
        if (aqicnError) {
          this.platform.log.error(`[${this.device.city}] Matter: AQICN API Error - ${aqicnError}`)
          return null
        }
        // The overall aqi can be a numeric string, '-' or missing on
        // community stations; normalise it (falling back to the highest
        // pollutant sub-index) before converting (#7)
        const aqi = normaliseAqicnAqi((response as AqicnData).data)
        if (aqi === undefined) {
          return null
        }
        return HomeKitAQI(Math.max(0, aqi))
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

  private isTimeoutError(error: any): boolean {
    const directCode = error?.code
    const directName = error?.name
    const nestedTimeout = Array.isArray(error?.errors)
      && error.errors.some((nested: any) => nested?.code === 'ETIMEDOUT' || nested?.code === 'UND_ERR_CONNECT_TIMEOUT')

    return directCode === 'ETIMEDOUT'
      || directCode === 'UND_ERR_CONNECT_TIMEOUT'
      || directName === 'AggregateError'
      || nestedTimeout
  }

  private async executeApiRequestWithFallback(url: string) {
    try {
      return await request(url, {
        headersTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
        bodyTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
        dispatcher: defaultApiAgent,
      })
    } catch (error: any) {
      if (!this.isTimeoutError(error)) {
        throw error
      }

      this.platform.log.warn(`[${this.device.city}] Matter: timeout detected, retrying with network family auto-selection disabled`)
      return request(url, {
        headersTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
        bodyTimeout: REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
        dispatcher: noFamilyAutoSelectAgent,
      })
    }
  }
}
