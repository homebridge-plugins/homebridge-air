/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils.ts: @homebridge-plugins/homebridge-air.
 */
import type { API, DynamicPlatformPlugin, Logging } from 'homebridge'

import type { AirPlatformConfig } from './settings.js'

/**
 * Factory function that returns a platform proxy constructor.
 *
 * When Matter is available, enabled, and opted into via config (`enableMatter` or `preferMatter`),
 * the proxy instantiates the provided Matter platform class. Otherwise it falls back to the
 * standard HAP platform.
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
      const enableMatter = config.options?.enableMatter ?? false
      const preferMatter = config.options?.preferMatter ?? false
      const matterAvailable = api.isMatterAvailable?.() ?? false
      const matterEnabled = api.isMatterEnabled?.() ?? false

      if ((enableMatter || preferMatter) && matterAvailable && matterEnabled) {
        return new MatterPlatformClass(log, config, api)
      }

      return new HapPlatform(log, config, api)
    }
  }

  return PlatformProxy as unknown as new (log: Logging, config: AirPlatformConfig, api: API) => DynamicPlatformPlugin
}
