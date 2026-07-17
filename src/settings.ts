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
    let cityPath = rawCity
    let pastedUrl = false

    // Allow users to paste a full AQICN URL (issue #7)
    if (rawCity.startsWith('http://') || rawCity.startsWith('https://')) {
      try {
        cityPath = new URL(rawCity).pathname
        pastedUrl = true
      } catch {
        // Fall through to other path/city handling.
      }
    }

    cityPath = cityPath.replace(/^\/+|\/+$/g, '')
    const looksLikeExplicitPath = pastedUrl
      || cityPath.startsWith('city/')
      || cityPath.startsWith('station/')
      || cityPath.includes('/city/')
      || cityPath.includes('/station/')

    // If the user supplied an explicit path, prefer it over geo coordinates.
    if (looksLikeExplicitPath) {
      // The feed API does not understand the website's path prefixes (#49):
      // city/<path> must become <path>.
      //
      // The website lists community sensors as station/@12345, but the feed
      // addresses those as A12345 - AQICN documents this itself on each
      // sensor's API page (aqicn.org/data-platform/api/A12345/) (#7, #49).
      // Accept the A12345 spelling under station/ too, since that is what a
      // user ends up with after copying the id back into a station URL.
      //
      const stationId = cityPath.match(/^station\/[@a](\d+)$/i)
      if (stationId) {
        return `A${stationId[1]}`
      }
      // Neither prefix means anything to the feed: a page at
      // /station/switzerland/tanikon is fetched as switzerland/tanikon (#72)
      for (const prefix of ['city/', 'station/']) {
        if (cityPath.startsWith(prefix)) {
          return cityPath.slice(prefix.length)
        }
      }
      return cityPath
    }
  }

  if (device.latitude && device.longitude) {
    return `geo:${device.latitude};${device.longitude}`
  }

  return rawCity || ''
}

/**
 * Detect an error inside an AQICN feed response.
 *
 * AQICN reports failures two ways: a top-level `status` of something other
 * than 'ok' (with the reason in `data`), or - for an unknown station id - a
 * top-level `status` of 'ok' with the error nested inside `data` (#7). Returns
 * the human-readable reason, or null when the response looks healthy.
 */
export function getAqicnError(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    return 'empty response'
  }
  const outer = response as { status?: string, msg?: string, data?: unknown }
  if (outer.status && outer.status !== 'ok') {
    return typeof outer.data === 'string' ? outer.data : (outer.msg ?? outer.status)
  }
  const data = outer.data as { status?: string, msg?: string } | undefined
  if (data && data.status === 'error') {
    return data.msg ?? 'unknown station'
  }
  return null
}

/**
 * Normalise the overall AQI from an AQICN feed response.
 *
 * Community stations can report the overall aqi as a numeric string, as '-'
 * or not at all while still providing pollutant readings in iaqi. AQICN's
 * overall AQI is the highest pollutant sub-index, so fall back to that (#7).
 * Returns undefined when no usable value exists.
 */
export function normaliseAqicnAqi(data: AqicnData['data'] | undefined): number | undefined {
  if (!data) {
    return undefined
  }
  const direct = typeof data.aqi === 'number' ? data.aqi : Number.parseFloat(String(data.aqi))
  if (Number.isFinite(direct)) {
    return direct
  }
  const iaqi = data.iaqi as Record<string, { v?: number }> | undefined
  const subIndices = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co']
    .map(pollutant => iaqi?.[pollutant]?.v)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return subIndices.length > 0 ? Math.max(...subIndices) : undefined
}

export interface AqicnData {
  status: string
  data: {
    idx: number
    aqi: number | string
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

/**
 * Pull the station name out of a provider response, so an accessory can be
 * named after the place it reports on rather than a bare id (#69).
 *
 * AQICN calls it city.name ('Kirchackerstrasse'); AirNow calls it
 * ReportingArea. Returns undefined when the provider gives us nothing usable.
 */
export function resolveProviderStationName(provider: string | undefined, status: unknown): string | undefined {
  const clean = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

  if (provider === 'aqicn') {
    const name = clean((status as AqicnData['data'] | undefined)?.city?.name)
    if (!name) {
      return undefined
    }
    // AQICN names follow 'Place, Country' or 'Street, City, Country'. The
    // country is superfluous to the user and the commas trip HomeKit's name
    // rules (#74) — so drop the final segment when there is more than one,
    // and join the rest without commas
    const segments = name.split(',').map(segment => segment.trim()).filter(segment => segment.length)
    if (segments.length > 1) {
      return segments.slice(0, -1).join(' ')
    }
    return segments[0]
  }

  if (provider === 'airnow') {
    // AirNow returns one record per pollutant, all for the same reporting area
    const records = status as AirNowAirQualityDataArray | undefined
    return Array.isArray(records) ? clean(records[0]?.ReportingArea) : undefined
  }

  return undefined
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
