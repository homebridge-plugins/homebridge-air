import { describe, expect, it } from 'vitest'

import { AqicnUrl, getAqicnError, hasCoordinates, HomeKitAQI, isCoordinate, normaliseAqicnAqi, REQUEST_RATE_LIMIT_CONFIG, REQUEST_TIMEOUT_CONFIG, resolveAqicnLocationSegment, resolveProviderStationName } from '../settings.js'

describe('homeKitAQI', () => {
  it('should return 0 for undefined AQI', () => {
    expect(HomeKitAQI(undefined)).toBe(0)
  })

  it('should return 1 for AQI <= 50', () => {
    expect(HomeKitAQI(50)).toBe(1)
    expect(HomeKitAQI(0)).toBe(1)
  })

  it('should return 2 for AQI between 51 and 100', () => {
    expect(HomeKitAQI(51)).toBe(2)
    expect(HomeKitAQI(100)).toBe(2)
  })

  it('should return 3 for AQI between 101 and 150', () => {
    expect(HomeKitAQI(101)).toBe(3)
    expect(HomeKitAQI(150)).toBe(3)
  })

  it('should return 4 for AQI between 151 and 200', () => {
    expect(HomeKitAQI(151)).toBe(4)
    expect(HomeKitAQI(200)).toBe(4)
  })

  it('should return 5 for AQI > 200', () => {
    expect(HomeKitAQI(201)).toBe(5)
    expect(HomeKitAQI(300)).toBe(5)
  })

  it('should return 0 for invalid AQI', () => {
    expect(HomeKitAQI(-1)).toBe(0)
  })
})

describe('uRL construction for AQICN API (issue #49)', () => {
  it('should construct HTTPS URLs for AQICN API requests', () => {
    // Verify the base URL uses HTTPS
    expect(AqicnUrl).toBe('https://api.waqi.info/feed/')

    // Test URL construction for the scenario mentioned in issue #49
    const cityId = 'A92323'
    const token = 'myToken'
    const expectedUrl = `https://api.waqi.info/feed/${cityId}/?token=${token}`
    const constructedUrl = `${AqicnUrl}${cityId}/?token=${token}`

    expect(constructedUrl).toBe(expectedUrl)
    expect(constructedUrl).toMatch(/^https:\/\//)
  })
})

describe('rEQUEST_TIMEOUT_CONFIG constants', () => {
  it('should have properly defined timeout constants', () => {
    expect(REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT).toBe(30000)
    expect(REQUEST_TIMEOUT_CONFIG.MAX_RETRY_TIMEOUT).toBe(30000)
    expect(REQUEST_TIMEOUT_CONFIG.MIN_RETRY_TIMEOUT).toBe(500)
    expect(REQUEST_TIMEOUT_CONFIG.IDLE_TIMEOUT).toBe(4000)
    expect(REQUEST_TIMEOUT_CONFIG.GEOCODE_TIMEOUT).toBe(10000)
    expect(REQUEST_TIMEOUT_CONFIG.AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT).toBe(250)
  })

  it('should have timeout values that make logical sense', () => {
    // Default timeout should be reasonable (30 seconds)
    expect(REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT).toBeGreaterThan(0)
    expect(REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT).toBeLessThanOrEqual(60000) // No more than 1 minute

    // Min retry timeout should be less than max retry timeout
    expect(REQUEST_TIMEOUT_CONFIG.MIN_RETRY_TIMEOUT).toBeLessThan(REQUEST_TIMEOUT_CONFIG.MAX_RETRY_TIMEOUT)

    // Idle timeout should be shorter than default timeout
    expect(REQUEST_TIMEOUT_CONFIG.IDLE_TIMEOUT).toBeLessThan(REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT)
  })
})

describe('rEQUEST_RATE_LIMIT_CONFIG constants', () => {
  it('should define shared cache and rate limit values', () => {
    expect(REQUEST_RATE_LIMIT_CONFIG.CACHE_MAX_AGE).toBe(600000)
    expect(REQUEST_RATE_LIMIT_CONFIG.CALL_WINDOW_MS).toBe(3600000)
    expect(REQUEST_RATE_LIMIT_CONFIG.MAX_CALLS_PER_WINDOW).toBe(60)
  })
})

describe('isCoordinate', () => {
  it('should accept zero, the equator and the prime meridian', () => {
    expect(isCoordinate(0)).toBe(true)
    expect(isCoordinate('0')).toBe(true)
  })

  it('should accept numbers and numeric strings the schema allows', () => {
    expect(isCoordinate(47.376887)).toBe(true)
    expect(isCoordinate(-112.074)).toBe(true)
    expect(isCoordinate('47.376887')).toBe(true)
  })

  it('should reject a missing or unusable coordinate', () => {
    expect(isCoordinate(undefined)).toBe(false)
    expect(isCoordinate(null)).toBe(false)
    expect(isCoordinate('')).toBe(false)
    expect(isCoordinate('nowhere')).toBe(false)
    expect(isCoordinate(Number.NaN)).toBe(false)
  })
})

describe('hasCoordinates', () => {
  it('should locate a station sitting on the prime meridian', () => {
    expect(hasCoordinates({ latitude: 51.4779, longitude: 0 })).toBe(true)
  })

  it('should locate a station sitting on the equator', () => {
    expect(hasCoordinates({ latitude: 0, longitude: 0 })).toBe(true)
  })

  it('should still accept coordinates saved as strings', () => {
    expect(hasCoordinates({ latitude: '47.376887' as any, longitude: '8.541694' as any })).toBe(true)
  })

  it('should reject a device with only one coordinate', () => {
    expect(hasCoordinates({ latitude: 47.5, longitude: undefined })).toBe(false)
    expect(hasCoordinates({ latitude: undefined, longitude: 8.7 })).toBe(false)
  })

  it('should reject a device with no coordinates', () => {
    expect(hasCoordinates({ latitude: undefined, longitude: undefined })).toBe(false)
  })
})

describe('resolveAqicnLocationSegment', () => {
  it('should build a geo segment for a station on the prime meridian', () => {
    const segment = resolveAqicnLocationSegment({
      city: undefined,
      latitude: 51.4779,
      longitude: 0,
    })
    expect(segment).toBe('geo:51.4779;0')
  })

  it('should prefer explicit station paths over coordinates', () => {
    const segment = resolveAqicnLocationSegment({
      city: '/station/@92323',
      latitude: 47.5,
      longitude: 8.7,
    })
    expect(segment).toBe('A92323')
  })

  it('should parse full AQICN station URL', () => {
    const segment = resolveAqicnLocationSegment({
      city: 'https://aqicn.org/station/@92323/',
      latitude: undefined,
      longitude: undefined,
    })
    expect(segment).toBe('A92323')
  })

  it('should fall back to geo when explicit path is absent', () => {
    const segment = resolveAqicnLocationSegment({
      city: 'A92323',
      latitude: 47.5,
      longitude: 8.7,
    })
    expect(segment).toBe('geo:47.5;8.7')
  })
})

describe('normaliseAqicnAqi', () => {
  const base = { idx: 1, time: { s: '', tz: '' }, city: { name: '', geo: [0, 0] as [number, number], url: '' }, attributions: [], forecast: { daily: { pm25: [], pm10: [], o3: [], uvi: [] } } }

  it('should return a numeric aqi unchanged', () => {
    expect(normaliseAqicnAqi({ ...base, aqi: 77, iaqi: {} })).toBe(77)
  })

  it('should keep an aqi of zero', () => {
    expect(normaliseAqicnAqi({ ...base, aqi: 0, iaqi: {} })).toBe(0)
  })

  it('should parse a numeric string aqi', () => {
    expect(normaliseAqicnAqi({ ...base, aqi: '42', iaqi: {} })).toBe(42)
  })

  it('should fall back to the highest pollutant sub-index when aqi is a dash', () => {
    expect(normaliseAqicnAqi({ ...base, aqi: '-', iaqi: { pm25: { v: 61 }, pm10: { v: 17 } } })).toBe(61)
  })

  it('should fall back to the highest pollutant sub-index when aqi is missing', () => {
    expect(normaliseAqicnAqi({ ...base, aqi: undefined as any, iaqi: { pm10: { v: 23 }, o3: { v: 12 } } })).toBe(23)
  })

  it('should return undefined when neither aqi nor pollutants are usable', () => {
    expect(normaliseAqicnAqi({ ...base, aqi: '-', iaqi: {} })).toBeUndefined()
    expect(normaliseAqicnAqi(undefined)).toBeUndefined()
  })
})

describe('getAqicnError', () => {
  it('should return null for a healthy response', () => {
    expect(getAqicnError({ status: 'ok', data: { aqi: 77, iaqi: {} } })).toBeNull()
  })

  it('should report a top-level error with a string data reason', () => {
    expect(getAqicnError({ status: 'error', data: 'Unknown station' })).toBe('Unknown station')
  })

  it('should report an error nested inside data under an ok status (#7)', () => {
    expect(getAqicnError({ status: 'ok', data: { status: 'error', msg: 'Unknown ID' } })).toBe('Unknown ID')
  })

  it('should fall back to a generic reason when a nested error has no message', () => {
    expect(getAqicnError({ status: 'ok', data: { status: 'error' } })).toBe('unknown station')
  })

  it('should treat a non-object response as an empty response', () => {
    expect(getAqicnError(undefined)).toBe('empty response')
    expect(getAqicnError('')).toBe('empty response')
  })
})

describe('resolveProviderStationName', () => {
  it('should use city.name for aqicn (#69)', () => {
    const status = { aqi: 25, city: { name: 'Kirchackerstrasse' } }
    expect(resolveProviderStationName('aqicn', status)).toBe('Kirchackerstrasse')
  })

  it('should trim surrounding whitespace', () => {
    expect(resolveProviderStationName('aqicn', { city: { name: '  Urodzajna  ' } })).toBe('Urodzajna')
  })

  it('should drop the country from place-country names (#74)', () => {
    expect(resolveProviderStationName('aqicn', { city: { name: 'Tanikon, Switzerland' } })).toBe('Tanikon')
  })

  it('should keep the city but drop the country from street-city-country names (#74)', () => {
    expect(resolveProviderStationName('aqicn', { city: { name: 'Kirchackerstrasse, Winterthur, Switzerland' } })).toBe('Kirchackerstrasse Winterthur')
  })

  it('should handle stray commas and empty segments (#74)', () => {
    expect(resolveProviderStationName('aqicn', { city: { name: 'Tanikon,, Switzerland' } })).toBe('Tanikon')
    expect(resolveProviderStationName('aqicn', { city: { name: ',' } })).toBeUndefined()
  })

  it('should return undefined when aqicn omits a usable name', () => {
    expect(resolveProviderStationName('aqicn', { city: { name: '' } })).toBeUndefined()
    expect(resolveProviderStationName('aqicn', { city: {} })).toBeUndefined()
    expect(resolveProviderStationName('aqicn', {})).toBeUndefined()
    expect(resolveProviderStationName('aqicn', undefined)).toBeUndefined()
  })

  it('should use ReportingArea for airnow (#69)', () => {
    const status = [{ ReportingArea: 'Winterthur', StateCode: 'ZH', AQI: 12 }]
    expect(resolveProviderStationName('airnow', status)).toBe('Winterthur')
  })

  it('should return undefined when airnow gives no records or no area', () => {
    expect(resolveProviderStationName('airnow', [])).toBeUndefined()
    expect(resolveProviderStationName('airnow', [{ AQI: 12 }])).toBeUndefined()
    expect(resolveProviderStationName('airnow', undefined)).toBeUndefined()
  })

  it('should return undefined for an unknown provider', () => {
    expect(resolveProviderStationName('somethingelse', { city: { name: 'Nope' } })).toBeUndefined()
    expect(resolveProviderStationName(undefined, { city: { name: 'Nope' } })).toBeUndefined()
  })
})
