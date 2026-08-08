/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils.ts: @homebridge-plugins/homebridge-air.
 */
import type { API, DynamicPlatformPlugin, Logging } from 'homebridge'

import type { AirPlatformConfig } from './settings.js'

/**
 * Factory function that returns a platform proxy constructor.
 *
 * Semantics:
 *  - `enableMatter: true`  – Opt into Matter explicitly. When Matter is available and enabled the
 *                            Matter platform is used. If Matter is unavailable or disabled a warning
 *                            is logged and the HAP platform is used as a fallback.
 *  - `preferMatter: true`  – Use Matter when available and enabled; silently fall back to HAP
 *                            without logging a warning when Matter is not available/disabled.
 *
 * @param HapPlatform - The HAP (HomeKit Accessory Protocol) platform constructor.
 * @param MatterPlatformClass - The Matter platform constructor.
 * @returns A new platform constructor that selects HAP or Matter at runtime.
 */
export function createPlatformProxy(
  HapPlatform: new (log: Logging, config: AirPlatformConfig, api: API) => DynamicPlatformPlugin,
  MatterPlatformClass: new (log: Logging, config: AirPlatformConfig, api: API) => DynamicPlatformPlugin,
): new (log: Logging, config: AirPlatformConfig, api: API) => DynamicPlatformPlugin {
  class PlatformProxy {
    constructor(log: Logging, config: AirPlatformConfig, api: API) {
      // Guard: no config means the plugin is not configured; let HapPlatform handle it gracefully.
      if (!config) {
        return new HapPlatform(log, config, api)
      }

      const enableMatter = config.options?.enableMatter ?? false
      const preferMatter = config.options?.preferMatter ?? false
      const matterAvailable = api.isMatterAvailable?.() ?? false
      const matterEnabled = api.isMatterEnabled?.() ?? false

      if ((enableMatter || preferMatter) && matterAvailable && matterEnabled) {
        return new MatterPlatformClass(log, config, api)
      }

      // `enableMatter` signals that the user explicitly wants Matter – warn them when it is not
      // available so they are aware something is preventing Matter from being used.
      if (enableMatter && (!matterAvailable || !matterEnabled)) {
        log.warn(
          'homebridge-air: Matter was requested via enableMatter but Matter is '
          + `${!matterAvailable ? 'not available in this version of Homebridge' : 'not enabled in Homebridge settings'}. `
          + 'Falling back to HAP.',
        )
      }

      return new HapPlatform(log, config, api)
    }
  }

  return PlatformProxy as unknown as new (log: Logging, config: AirPlatformConfig, api: API) => DynamicPlatformPlugin
}

/**
 * The largest delay a Node timer can hold, because it is stored in a signed
 * 32-bit integer. Roughly 24.85 days.
 */
export const MAX_TIMER_MS = 2147483647

/**
 * Keep a computed delay inside the range a Node timer can represent.
 *
 * Going over the limit does not throw. Node prints a TimeoutOverflowWarning and
 * quietly sets the delay to 1 ms, so a timer meant to fire in weeks fires a
 * thousand times a second instead - which for a polling loop means hammering
 * the service it polls.
 *
 * Clamping means a delay longer than 24.85 days simply fires at 24.85 days,
 * which for every setting here is early rather than wrong.
 */
export function safeTimerMs(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) {
    return 1
  }
  return Math.min(Math.floor(ms), MAX_TIMER_MS)
}

/**
 * The messages to log when AirNow returns no usable observation.
 *
 * An empty array is a valid answer, not a broken endpoint: it means no reporting
 * station was found within `distance` miles. Saying only "invalid response structure"
 * sent one reporter looking for a retired API rather than widening the radius (#84),
 * so the empty-array case now explains itself the way the empty-body case already did.
 *
 * @param response - the parsed AirNow response
 * @param distance - the search radius in miles that produced it
 * @returns the error lines to log, in order
 */
export function airNowEmptyResultMessages(response: unknown, distance: string): string[] {
  if (Array.isArray(response)) {
    return [
      `AirNow API Error - no air quality data returned for your location within ${distance} miles`,
      'Try increasing the distance parameter, or verify your zip code / coordinates are correct.',
    ]
  }

  return ['AirNow API Error - Invalid response structure or empty data']
}
