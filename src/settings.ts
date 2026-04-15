/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * settings.ts: @homebridge-plugins/homebridge-air.
 */
import type { PlatformConfig } from 'homebridge'

/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'Air'

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = '@homebridge-plugins/homebridge-air'

/**
 * This must match the name of your plugin as defined the package.json
 */
export const AirNowUrl = 'https://www.airnowapi.org/aq/observation/'
export const AqicnUrl = 'https://api.waqi.info/feed/'

/**
 * HTTP Request Timeout Configuration Constants (in milliseconds)
 */
export const REQUEST_TIMEOUT_CONFIG = {
  /** Default timeout for HTTP requests - monitors time between receiving body data */
  DEFAULT_TIMEOUT: 30000,
  /** Maximum timeout between retries */
  MAX_RETRY_TIMEOUT: 30000,
  /** Initial timeout for the first retry attempt */
  MIN_RETRY_TIMEOUT: 500,
  /** Socket idle timeout - time after which inactive sockets timeout */
  IDLE_TIMEOUT: 4000,
  /** Timeout used for reverse geocoding lookup requests */
  GEOCODE_TIMEOUT: 10000,
  /** Timeout used by Node family auto-selection attempt before fallback */
  AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT: 250,
} as const

/**
 * Request throttling and cache constants used by both HAP and Matter polling paths.
 */
export const REQUEST_RATE_LIMIT_CONFIG = {
  /** Cache successful API responses for 10 minutes. */
  CACHE_MAX_AGE: 600000,
  /** Track call counts in 1 hour windows. */
  CALL_WINDOW_MS: 3600000,
  /** Conservative call cap to reduce provider throttling. */
  MAX_CALLS_PER_WINDOW: 60,
} as const

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
  enableMatter?: boolean
  preferMatter?: boolean
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

/**
 * Build the AQICN location segment for /feed/<segment> requests.
 *
 * Priority:
 * 1) explicit station/city path (or full AQICN URL) from city field
 * 2) geo:lat;lon when coordinates are provided
 * 3) plain city value
 */
export function resolveAqicnLocationSegment(device: Pick<devicesConfig, 'city' | 'latitude' | 'longitude'>): string {
  const rawCity = device.city?.trim()

  if (rawCity) {
    // Allow users to paste a full AQICN URL (issue #7)
    if (rawCity.startsWith('http://') || rawCity.startsWith('https://')) {
      try {
        const parsed = new URL(rawCity)
        const path = parsed.pathname.replace(/^\/+|\/+$/g, '')
        if (path.startsWith('city/') || path.startsWith('station/')) {
          return path
        }
      } catch {
        // Fall through to other path/city handling.
      }
    }

    const cityPath = rawCity.replace(/^\/+|\/+$/g, '')
    const looksLikeExplicitPath = cityPath.startsWith('city/')
      || cityPath.startsWith('station/')
      || cityPath.includes('/city/')
      || cityPath.includes('/station/')

    // If the user supplied an explicit path, prefer it over geo coordinates.
    if (looksLikeExplicitPath) {
      return cityPath
    }
  }

  if (device.latitude && device.longitude) {
    return `geo:${device.latitude};${device.longitude}`
  }

  return rawCity || ''
}

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
      // Air quality pollutants
      pm25?: {
        v: number
      }
      pm10?: {
        v: number
      }
      o3?: {
        v: number
      }
      no2?: {
        v: number
      }
      so2?: {
        v: number
      }
      co?: {
        v: number
      }
      dew?: {
        v: number
      }
      h?: {
        v: number
      }
      p?: {
        v: number
      }
      t?: {
        v: number
      }
      w?: {
        v: number
      }
      wg?: {
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
