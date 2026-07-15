import type { devicesConfig } from '../settings.js'

import { describe, expect, it } from 'vitest'

import { AqicnUrl, resolveAqicnLocationSegment } from '../settings.js'

/**
 * Test the AQICN URL construction logic to ensure it supports
 * various URL patterns as requested in issue #45.
 *
 * The expected feed paths are verified against the live API (#49):
 * the feed endpoint rejects the website's 'city/' and 'station/'
 * path prefixes, so they must be stripped.
 */
describe('aQICN URL Construction', () => {
  /**
   * Mock the URL construction logic from AirQualitySensor.refreshStatus()
   * This simulates lines 188-199 in airqualitysensor.ts
   */
  function constructAqicnUrl(device: Partial<devicesConfig>): string {
    const AqicnCurrentObservationBy = resolveAqicnLocationSegment({
      city: device.city,
      latitude: device.latitude,
      longitude: device.longitude,
    })

    return `${AqicnUrl}${AqicnCurrentObservationBy}${AqicnCurrentObservationBy ? '/' : ''}?token=${device.apiKey}`
  }

  it('should support geo coordinates (existing functionality)', () => {
    const device: Partial<devicesConfig> = {
      latitude: 47.5,
      longitude: 8.7,
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/geo:47.5;8.7/?token=test-api-key')
  })

  it('should support simple city names (existing functionality)', () => {
    const device: Partial<devicesConfig> = {
      city: 'winterthur',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/winterthur/?token=test-api-key')
  })

  it('should strip the city/ prefix from /city/country/cityname syntax', () => {
    const device: Partial<devicesConfig> = {
      city: '/city/switzerland/winterthur-veltheim',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/switzerland/winterthur-veltheim/?token=test-api-key')
  })

  it('should strip the city/ prefix from city/country/cityname syntax without leading slash', () => {
    const device: Partial<devicesConfig> = {
      city: 'city/switzerland/tanikon',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/switzerland/tanikon/?token=test-api-key')
  })

  it('should convert /station/@stationid syntax to the A-prefixed feed format', () => {
    const device: Partial<devicesConfig> = {
      city: '/station/@92323',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/A92323/?token=test-api-key')
  })

  it('should convert station/@stationid syntax without leading slash', () => {
    const device: Partial<devicesConfig> = {
      city: 'station/@231133',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/A231133/?token=test-api-key')
  })

  it('should pass /station/station-name/locale syntax through unchanged (no feed equivalent)', () => {
    const device: Partial<devicesConfig> = {
      city: '/station/bielsko-bia%C5%82a-poland-bielsko-biala-urodzajna/pl',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/station/bielsko-bia%C5%82a-poland-bielsko-biala-urodzajna/pl/?token=test-api-key')
  })

  it('should pass a bare @stationid value through as the official feed format', () => {
    const device: Partial<devicesConfig> = {
      city: '@92323',
      apiKey: 'test-api-key',
    }

    // A bare @id is the feed's own format for official stations, so it must
    // not be rewritten to the A-prefixed community sensor form
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/@92323/?token=test-api-key')
  })

  it('should support a local sensor id value (A12345)', () => {
    const device: Partial<devicesConfig> = {
      city: 'A92323',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/A92323/?token=test-api-key')
  })

  it('should prioritize explicit station/city paths over geo coordinates', () => {
    const device: Partial<devicesConfig> = {
      latitude: 47.5,
      longitude: 8.7,
      city: '/city/switzerland/winterthur-veltheim', // Coordinates should be ignored when an explicit path is present
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/switzerland/winterthur-veltheim/?token=test-api-key')
  })

  it('should support full AQICN station URL input', () => {
    const device: Partial<devicesConfig> = {
      city: 'https://aqicn.org/station/@92323/',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/A92323/?token=test-api-key')
  })

  it('should support full AQICN city URL input', () => {
    const device: Partial<devicesConfig> = {
      city: 'https://aqicn.org/city/switzerland/winterthur-veltheim/',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/switzerland/winterthur-veltheim/?token=test-api-key')
  })

  it('should handle empty city gracefully', () => {
    const device: Partial<devicesConfig> = {
      city: '',
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/?token=test-api-key')
  })

  it('should handle undefined city gracefully', () => {
    const device: Partial<devicesConfig> = {
      apiKey: 'test-api-key',
    }

    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/?token=test-api-key')
  })

  // Integration test with real-world examples from issue #45
  it('should support all example URLs from issue #45', () => {
    const examples = [
      // Original examples from the issue, mapped to their valid feed paths
      { input: '/city/switzerland/winterthur-veltheim', expected: 'https://api.waqi.info/feed/switzerland/winterthur-veltheim/?token=test-key' },
      { input: '/city/switzerland/tanikon', expected: 'https://api.waqi.info/feed/switzerland/tanikon/?token=test-key' },
      { input: '/station/@92323', expected: 'https://api.waqi.info/feed/A92323/?token=test-key' },
      { input: '/station/@231133', expected: 'https://api.waqi.info/feed/A231133/?token=test-key' },
      { input: '/station/bielsko-bia%C5%82a-poland-bielsko-biala-urodzajna/pl', expected: 'https://api.waqi.info/feed/station/bielsko-bia%C5%82a-poland-bielsko-biala-urodzajna/pl/?token=test-key' },

      // Backward compatibility examples
      { input: 'winterthur', expected: 'https://api.waqi.info/feed/winterthur/?token=test-key' },
      { input: 'beijing', expected: 'https://api.waqi.info/feed/beijing/?token=test-key' },
    ]

    examples.forEach(({ input, expected }) => {
      const device: Partial<devicesConfig> = {
        city: input,
        apiKey: 'test-key',
      }

      const url = constructAqicnUrl(device)
      expect(url).toBe(expected)
    })
  })
})
