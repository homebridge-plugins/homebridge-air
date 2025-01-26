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
export const AirNowUrl = 'https://www.airnowapi.org/aq/observation/'
export const AqicnUrl = 'http://api.waqi.info/feed/'

// Config
export interface AirPlatformConfig extends PlatformConfig {
  name?: string
  devices?: devicesConfig[]
  options?: options
}

export interface devicesConfig {
  provider: string
  apiKey?: string
  latitude?: number
  longitude?: number
  city?: string
  state?: string
  zipCode?: string
  distance?: string
  firmware: string
  refreshRate?: number
  updateRate?: number
  pushRate?: number
  logging?: string
  hide_device?: boolean
}

export interface options {
  allowInvalidCharacters?: boolean
  refreshRate?: number
  updateRate?: number
  pushRate?: number
  logging?: string
}

interface Category {
  Number: number
  Name: string
}

interface AirNowAirQualityData {
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

export type AirNowAirQualityDataArray = AirNowAirQualityData[]

export interface AqicnData {
  status: string
  data: {
    idx: number
    aqi: number
    time: {
      s: string
      tz: string
    }
    city: {
      name: string
      geo: [number, number]
      url: string
    }
    attributions: {
      name: string
      url: string
    }[]
    iaqi: {
      pm25: {
        v: number
      }
    }
    forecast: {
      daily: {
        pm25: {
          v: number
        }[]
        pm10: {
          v: number
        }[]
        o3: {
          v: number
        }[]
        uvi: {
          v: number
        }[]
      }
    }
  }
}

export function HomeKitAQI(aqi: number | undefined): number {
  if (aqi === undefined || aqi < 0) {
    return 0
  } else if (aqi <= 50) {
    return 1
  } else if (aqi <= 100) {
    return 2
  } else if (aqi <= 150) {
    return 3
  } else if (aqi <= 200) {
    return 4
  } else {
    return 5
  }
}
