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
  // eslint-disable-next-line ts/no-extraneous-class
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
