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
  refreshRate?: number
  logging?: string
  options?: options
}

export interface devicesConfig {
  provider: string
  apiKey?: string
  configDeviceName?: string
  latitude?: number
  longitude?: number
  city?: string
  state?: string
  zipCode?: string
  distance?: string
  firmware?: string
  refreshRate?: number
  logging?: string
  hide_device?: boolean
}

export interface options {
  allowInvalidCharacters?: boolean
  refreshRate?: number
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
 * Is this a usable coordinate?
 *
 * Zero is a real coordinate - the equator and the prime meridian - so a plain
 * truthiness check would drop a station on either line. Coordinates also reach
 * us as strings from older UI saves and hand-written configs, which the schema
 * still accepts, so both spellings have to be understood here.
 */
export function isCoordinate(value: number | string | undefined | null): boolean {
  if (value === undefined || value === null || value === '') {
    return false
  }
  return Number.isFinite(typeof value === 'number' ? value : Number.parseFloat(value))
}

/**
 * Does this device locate itself by coordinates rather than by zip/city?
 *
 * Narrows both coordinates to present, so callers can use them straight away
 * exactly as the old `latitude && longitude` checks let them.
 */
export function hasCoordinates<T extends Pick<devicesConfig, 'latitude' | 'longitude'>>(
  device: T,
): device is T & { latitude: number, longitude: number } {
  return isCoordinate(device.latitude) && isCoordinate(device.longitude)
}

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

  if (hasCoordinates(device)) {
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

/**
 * Pollutants that both providers report a sub-index for, in the order the
 * accessory processes them.
 */
export type Pollutant = 'co' | 'no2' | 'o3' | 'pm10' | 'pm25' | 'so2'

/**
 * US EPA AQI breakpoint tables, as [aqiLow, aqiHigh, concLow, concHigh].
 *
 * Concentrations are in the units the EPA defines the breakpoints in, which is
 * not the same for every pollutant: pm25 and pm10 in µg/m³, o3 and co in ppm,
 * no2 and so2 in ppb. `EPA_TO_HOMEKIT` converts each into the unit its HomeKit
 * characteristic expects. The pm25 table uses the breakpoints EPA revised in
 * May 2024.
 */
/**
 * PM2.5 breakpoints as they stood before the EPA's 2024 revision, which moved
 * the top of the "good" band from 12.0 down to 9.0 µg/m³.
 *
 * AQICN still publishes its index on the older scale. Confirmed from their own
 * station pages, which show both figures on hover: an index of 35 is labelled
 * as a raw concentration of 8.3 µg/m³, and 8.3 only maps back to 35 on this
 * table (it would be 46 on the revised one). Reported on #79 by @jsiegenthaler.
 */
const EPA_BREAKPOINTS_PM25_PRE_2024: [number, number, number, number][] = [
  [0, 50, 0, 12],
  [51, 100, 12.1, 35.4],
  [101, 150, 35.5, 55.4],
  [151, 200, 55.5, 150.4],
  [201, 300, 150.5, 250.4],
  [301, 500, 250.5, 500.4],
]

const EPA_BREAKPOINTS: Record<Pollutant, [number, number, number, number][]> = {
  pm25: [
    [0, 50, 0, 9],
    [51, 100, 9.1, 35.4],
    [101, 150, 35.5, 55.4],
    [151, 200, 55.5, 125.4],
    [201, 300, 125.5, 225.4],
    [301, 500, 225.5, 325.4],
  ],
  pm10: [
    [0, 50, 0, 54],
    [51, 100, 55, 154],
    [101, 150, 155, 254],
    [151, 200, 255, 354],
    [201, 300, 355, 424],
    [301, 400, 425, 504],
    [401, 500, 505, 604],
  ],
  o3: [
    [0, 50, 0, 0.054],
    [51, 100, 0.055, 0.07],
    [101, 150, 0.071, 0.085],
    [151, 200, 0.086, 0.105],
    [201, 300, 0.106, 0.2],
  ],
  co: [
    [0, 50, 0, 4.4],
    [51, 100, 4.5, 9.4],
    [101, 150, 9.5, 12.4],
    [151, 200, 12.5, 15.4],
    [201, 300, 15.5, 30.4],
    [301, 400, 30.5, 40.4],
    [401, 500, 40.5, 50.4],
  ],
  no2: [
    [0, 50, 0, 53],
    [51, 100, 54, 100],
    [101, 150, 101, 360],
    [151, 200, 361, 649],
    [201, 300, 650, 1249],
    [301, 500, 1250, 2049],
  ],
  so2: [
    [0, 50, 0, 35],
    [51, 100, 36, 75],
    [101, 150, 76, 185],
    [151, 200, 186, 304],
    [201, 300, 305, 604],
    [301, 500, 605, 1004],
  ],
}

/**
 * Factor converting an EPA breakpoint concentration into the unit the matching
 * HomeKit characteristic expects, at 25°C and 1 atm.
 *
 * The density characteristics are all µg/m³, so the gas pollutants have to come
 * off their EPA units: µg/m³ = ppb × molecularWeight / 24.45. CarbonMonoxideLevel
 * is defined in ppm, which is already the unit EPA uses for CO, so it stays 1.
 */
const EPA_TO_HOMEKIT: Record<Pollutant, number> = {
  pm25: 1, // already µg/m³
  pm10: 1, // already µg/m³
  o3: 1962.5, // ppm -> µg/m³ (48.00 g/mol)
  no2: 1.8816, // ppb -> µg/m³ (46.01 g/mol)
  so2: 2.6203, // ppb -> µg/m³ (64.07 g/mol)
  co: 1, // ppm, matches CarbonMonoxideLevel
}

/**
 * Convert an AQI sub-index back into a pollutant concentration (#77).
 *
 * Both providers hand us AQI index values, never raw concentrations: AirNow's
 * current-observation endpoint only carries `AQI`, and AQICN's `iaqi` entries
 * are sub-indices too. Writing those straight into HomeKit's density
 * characteristics reports the wrong quantity entirely — an index on a 0-500
 * scale shown as though it were µg/m³.
 *
 * Running the EPA breakpoint formula backwards recovers the concentration the
 * index was derived from. It is an approximation, because the forward
 * conversion rounds the index to a whole number, so expect to be within about
 * one unit of the true reading rather than exact.
 *
 * Returns undefined when the index is unusable or sits above the top
 * breakpoint, so the caller can leave the characteristic alone.
 */
export function aqiToConcentration(pollutant: Pollutant, aqi: number | undefined, provider?: string): number | undefined {
  if (aqi === undefined || !Number.isFinite(aqi) || aqi < 0) {
    return undefined
  }

  // AQICN publishes its PM2.5 index on the pre-2024 scale, so it has to be read
  // back with the breakpoints it was built from (#79)
  const table = pollutant === 'pm25' && provider === 'aqicn'
    ? EPA_BREAKPOINTS_PM25_PRE_2024
    : EPA_BREAKPOINTS[pollutant]

  const band = table.find(([aqiLow, aqiHigh]) => aqi >= aqiLow && aqi <= aqiHigh)
  if (!band) {
    return undefined
  }

  const [aqiLow, aqiHigh, concLow, concHigh] = band
  const concentration = ((aqi - aqiLow) / (aqiHigh - aqiLow)) * (concHigh - concLow) + concLow
  const converted = concentration * EPA_TO_HOMEKIT[pollutant]

  // Two decimals is well past the precision the source index can justify, but
  // keeps small ppm values for CO from collapsing to zero.
  return Math.round(converted * 100) / 100
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

/**
 * A record as the newer `current/ziplatlong` AirNow endpoint returns it.
 *
 * Every field is camelCase where the older `zipCode/current` endpoint used
 * PascalCase, the AQI arrives as `nowcastAQI`, and ozone is spelled out as
 * `OZONE` rather than `O3` (#84).
 */
interface AirNowZipLatLongRecord {
  dateObserved?: string
  hourObserved?: string
  localTimeZone?: string
  reportingAreaName?: string
  parameterName?: string
  nowcastAQI?: number
  aqiCategoryName?: string
}

/**
 * Pollutant names the newer endpoint uses, mapped onto the ones the accessory
 * already looks for. Only ozone actually differs.
 */
const AIRNOW_PARAMETER_ALIASES: Record<string, string> = {
  OZONE: 'O3',
}

/**
 * Normalise an AirNow response onto the record shape the accessory consumes.
 *
 * AirNow appears to be migrating between two endpoints that answer with
 * different shapes, and a remote location can be served by one and not the
 * other (#84). Rather than betting on either, accept both: a response already
 * in the older shape is passed through untouched, and the newer one is mapped.
 *
 * Only the fields the plugin actually reads are mapped - `AQI`,
 * `ParameterName` and `ReportingArea`. The rest of the newer payload (site id,
 * reporting agency, lookup behaviour) has no consumer here.
 *
 * @param response - the parsed AirNow response
 * @returns records in the accessory's shape, or undefined if unrecognisable
 */
export function normaliseAirNowRecords(response: unknown): AirNowAirQualityDataArray | undefined {
  if (!Array.isArray(response)) {
    return undefined
  }

  return response.map((record) => {
    if (record && typeof record === 'object' && 'ParameterName' in record) {
      return record as AirNowAirQualityData // already the older shape
    }

    const source = record as AirNowZipLatLongRecord
    const parameter = typeof source?.parameterName === 'string' ? source.parameterName : ''

    return {
      DateObserved: source?.dateObserved ?? '',
      // the newer endpoint sends "10:00" where the older one sent 10
      HourObserved: Number.parseInt(source?.hourObserved ?? '', 10),
      LocalTimeZone: source?.localTimeZone ?? '',
      ReportingArea: source?.reportingAreaName ?? '',
      StateCode: '',
      Latitude: Number.NaN,
      Longitude: Number.NaN,
      ParameterName: AIRNOW_PARAMETER_ALIASES[parameter] ?? parameter,
      AQI: source?.nowcastAQI as number,
      Category: { Number: Number.NaN, Name: source?.aqiCategoryName ?? '' },
    } satisfies AirNowAirQualityData
  })
}
