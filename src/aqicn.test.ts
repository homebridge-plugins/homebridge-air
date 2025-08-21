import { describe, expect, it } from 'vitest'

import type { AqicnData } from './settings.js'

describe('AqicnData interface', () => {
  it('should handle AQICN response with all pollutants', () => {
    const mockAqicnResponse: AqicnData = {
      status: 'ok',
      data: {
        idx: 7397,
        aqi: 55,
        time: {
          s: '2024-01-15 14:00:00',
          tz: '+01:00',
        },
        city: {
          name: 'Kraków, Poland',
          geo: [50.0647, 19.9450],
          url: 'https://aqicn.org/city/poland/krakow',
        },
        attributions: [{
          name: 'GIOS',
          url: 'http://www.gios.gov.pl/',
        }],
        iaqi: {
          pm25: { v: 45 },
          pm10: { v: 60 },
          o3: { v: 25 },
          no2: { v: 35 },
          so2: { v: 15 },
          co: { v: 8 },
        },
        forecast: {
          daily: {
            pm25: [{ v: 45 }],
            pm10: [{ v: 60 }],
            o3: [{ v: 25 }],
            uvi: [{ v: 3 }],
          },
        },
      },
    }

    // Test that the interface allows all pollutant properties
    expect(mockAqicnResponse.data.iaqi.pm25?.v).toBe(45)
    expect(mockAqicnResponse.data.iaqi.pm10?.v).toBe(60)
    expect(mockAqicnResponse.data.iaqi.o3?.v).toBe(25)
    expect(mockAqicnResponse.data.iaqi.no2?.v).toBe(35)
    expect(mockAqicnResponse.data.iaqi.so2?.v).toBe(15)
    expect(mockAqicnResponse.data.iaqi.co?.v).toBe(8)
  })

  it('should handle AQICN response with only PM2.5 (GAIA station)', () => {
    const mockGaiaResponse: AqicnData = {
      status: 'ok',
      data: {
        idx: 12345,
        aqi: 35,
        time: {
          s: '2024-01-15 14:00:00',
          tz: '+01:00',
        },
        city: {
          name: 'GAIA Station',
          geo: [49.8113, 19.0732],
          url: 'https://aqicn.org/station/@12345',
        },
        attributions: [{
          name: 'GAIA',
          url: 'https://aqicn.org/',
        }],
        iaqi: {
          pm25: { v: 35 },
          // GAIA stations might only provide PM2.5
        },
        forecast: {
          daily: {
            pm25: [{ v: 35 }],
            pm10: [],
            o3: [],
            uvi: [],
          },
        },
      },
    }

    // Test that the interface handles partial data
    expect(mockGaiaResponse.data.iaqi.pm25?.v).toBe(35)
    expect(mockGaiaResponse.data.iaqi.pm10?.v).toBeUndefined()
    expect(mockGaiaResponse.data.iaqi.o3?.v).toBeUndefined()
    expect(mockGaiaResponse.data.iaqi.no2?.v).toBeUndefined()
    expect(mockGaiaResponse.data.iaqi.so2?.v).toBeUndefined()
    expect(mockGaiaResponse.data.iaqi.co?.v).toBeUndefined()
  })

  it('should handle AQICN response with empty iaqi object', () => {
    const mockEmptyResponse: AqicnData = {
      status: 'ok',
      data: {
        idx: 12345,
        aqi: -1,
        time: {
          s: '2024-01-15 14:00:00',
          tz: '+01:00',
        },
        city: {
          name: 'Unknown Station',
          geo: [49.8113, 19.0732],
          url: 'https://aqicn.org/station/@12345',
        },
        attributions: [],
        iaqi: {
          // Empty iaqi object - all pollutants are optional
        },
        forecast: {
          daily: {
            pm25: [],
            pm10: [],
            o3: [],
            uvi: [],
          },
        },
      },
    }

    // Test that the interface handles empty iaqi
    expect(mockEmptyResponse.data.iaqi.pm25?.v).toBeUndefined()
    expect(mockEmptyResponse.data.iaqi.pm10?.v).toBeUndefined()
    expect(mockEmptyResponse.data.iaqi.o3?.v).toBeUndefined()
    expect(mockEmptyResponse.data.iaqi.no2?.v).toBeUndefined()
    expect(mockEmptyResponse.data.iaqi.so2?.v).toBeUndefined()
    expect(mockEmptyResponse.data.iaqi.co?.v).toBeUndefined()
  })
})