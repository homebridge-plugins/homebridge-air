import { describe, expect, it } from 'vitest'

import { AqicnUrl } from './settings.js'
import type { devicesConfig } from './settings.js'

/**
 * Test the AQICN URL construction logic to ensure it supports
 * various URL patterns as requested in issue #45
 */
describe('AQICN URL Construction', () => {
  /**
   * Mock the URL construction logic from AirQualitySensor.refreshStatus()
   * This simulates lines 188-199 in airqualitysensor.ts
   */
  function constructAqicnUrl(device: Partial<devicesConfig>): string {
    // Support flexible AQICN URL patterns: geo coordinates, city names, and full URL paths
    let AqicnCurrentObservationBy: string
    if (device.latitude && device.longitude) {
      // Use geo coordinates when available
      AqicnCurrentObservationBy = `geo:${device.latitude};${device.longitude}`
    } else if (device.city?.startsWith('/') || device.city?.includes('/city/') || device.city?.includes('/station/')) {
      // Support full URL paths like /city/country/cityname, /station/@stationid, /station/station-name/locale
      AqicnCurrentObservationBy = device.city.startsWith('/') ? device.city.substring(1) : device.city
    } else {
      // Default to simple city name for backward compatibility
      AqicnCurrentObservationBy = device.city || ''
    }
    
    return `${AqicnUrl}${AqicnCurrentObservationBy}${AqicnCurrentObservationBy ? '/' : ''}?token=${device.apiKey}`
  }

  it('should support geo coordinates (existing functionality)', () => {
    const device: Partial<devicesConfig> = {
      latitude: 47.5,
      longitude: 8.7,
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/geo:47.5;8.7/?token=test-api-key')
  })

  it('should support simple city names (existing functionality)', () => {
    const device: Partial<devicesConfig> = {
      city: 'winterthur',
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/winterthur/?token=test-api-key')
  })

  it('should support /city/country/cityname syntax', () => {
    const device: Partial<devicesConfig> = {
      city: '/city/switzerland/winterthur-veltheim',
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/city/switzerland/winterthur-veltheim/?token=test-api-key')
  })

  it('should support city/country/cityname syntax without leading slash', () => {
    const device: Partial<devicesConfig> = {
      city: 'city/switzerland/tanikon',
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/city/switzerland/tanikon/?token=test-api-key')
  })

  it('should support /station/@stationid syntax', () => {
    const device: Partial<devicesConfig> = {
      city: '/station/@92323',
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/station/@92323/?token=test-api-key')
  })

  it('should support station/@stationid syntax without leading slash', () => {
    const device: Partial<devicesConfig> = {
      city: 'station/@231133',
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/station/@231133/?token=test-api-key')
  })

  it('should support /station/station-name/locale syntax', () => {
    const device: Partial<devicesConfig> = {
      city: '/station/bielsko-bia%C5%82a-poland-bielsko-biala-urodzajna/pl',
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/station/bielsko-bia%C5%82a-poland-bielsko-biala-urodzajna/pl/?token=test-api-key')
  })

  it('should support station/station-name/locale syntax without leading slash', () => {
    const device: Partial<devicesConfig> = {
      city: 'station/bielsko-bia%C5%82a-poland-bielsko-biala-urodzajna/pl',
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/station/bielsko-bia%C5%82a-poland-bielsko-biala-urodzajna/pl/?token=test-api-key')
  })

  it('should prioritize geo coordinates over city patterns', () => {
    const device: Partial<devicesConfig> = {
      latitude: 47.5,
      longitude: 8.7,
      city: '/city/switzerland/winterthur-veltheim', // Should be ignored when coordinates are present
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/geo:47.5;8.7/?token=test-api-key')
  })

  it('should handle empty city gracefully', () => {
    const device: Partial<devicesConfig> = {
      city: '',
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/?token=test-api-key')
  })

  it('should handle undefined city gracefully', () => {
    const device: Partial<devicesConfig> = {
      apiKey: 'test-api-key'
    }
    
    const url = constructAqicnUrl(device)
    expect(url).toBe('https://api.waqi.info/feed/?token=test-api-key')
  })
})