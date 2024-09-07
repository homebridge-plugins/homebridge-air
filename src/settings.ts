/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * settings.ts: homebridge-air.
 */
import type { PlatformConfig } from 'homebridge'
/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'Air'

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = 'homebridge-air'

/**
 * This must match the name of your plugin as defined the package.json
 */
export const AirNowUrl = 'https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json'

// Config
export interface AirPlatformConfig extends PlatformConfig {
  name?: string
  devices?: devicesConfig[]
  refreshRate?: number
  logging?: string
}

export interface devicesConfig {
  provider: string
  apiKey?: string
  distance?: string
  locationName?: string
  zipCode?: string
  firmware: string
  refreshRate?: number
  logging?: string
  delete?: boolean
}

interface Category {
  Number: number
  Name: string
}

interface AirQualityData {
  DateObserved: string
  HourObserved: number
  LocalTimeZone: string
  ReportingArea: string
  StateCode: string
  Latitude: number
  Longitude: number
  ParameterName: string
  AQI: number
  Category: Category
}

export type AirQualityDataArray = AirQualityData[]
