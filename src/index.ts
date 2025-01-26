/* Copyright(C) 2021-2023, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * index.ts: @homebridge-plugins/homebridge-air.
 */
import type { API } from 'homebridge'

import { AirPlatform } from './platform.js'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'

// Register our platform with homebridge.
export default (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, AirPlatform)
}
