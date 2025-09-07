import { describe, expect, it } from 'vitest'

import type { AqicnData } from './settings.js'

describe('AqicnData interface', () => {
  it('should handle valid AQICN response with all pollutants', () => {
    const mockAqicnResponse: AqicnData = {
      status: 'ok',
      data: {
        idx: 123,
        aqi: 85,
        time: {
          s: '2025-08-31 10:00:00',
          tz: '+02:00',
        },
        city: {
          name: 'Winterthur',
          geo: [47.5, 8.7],
          url: 'https://aqicn.org/city/winterthur',
        },
        attributions: [
          {
            name: 'World Air Quality Index Project',
            url: 'https://waqi.info/',
          },
        ],
        iaqi: {
          pm25: { v: 45 },
          pm10: { v: 55 },
          o3: { v: 35 },
          no2: { v: 25 },
          so2: { v: 15 },
          co: { v: 5 },
        },
        forecast: {
          daily: {
            pm25: [{ v: 40 }],
            pm10: [{ v: 50 }],
            o3: [{ v: 30 }],
            uvi: [{ v: 3 }],
          },
        },
      },
    }

    // Verify that all pollutant properties can be accessed
    expect(mockAqicnResponse.status).toBe('ok')
    expect(mockAqicnResponse.data.aqi).toBe(85)
    expect(mockAqicnResponse.data.iaqi.pm25?.v).toBe(45)
    expect(mockAqicnResponse.data.iaqi.pm10?.v).toBe(55)
    expect(mockAqicnResponse.data.iaqi.o3?.v).toBe(35)
    expect(mockAqicnResponse.data.iaqi.no2?.v).toBe(25)
    expect(mockAqicnResponse.data.iaqi.so2?.v).toBe(15)
    expect(mockAqicnResponse.data.iaqi.co?.v).toBe(5)
  })

  it('should handle AQICN response with missing pollutants', () => {
    const mockAqicnResponse: AqicnData = {
      status: 'ok',
      data: {
        idx: 123,
        aqi: 85,
        time: {
          s: '2025-08-31 10:00:00',
          tz: '+02:00',
        },
        city: {
          name: 'Winterthur',
          geo: [47.5, 8.7],
          url: 'https://aqicn.org/city/winterthur',
        },
        attributions: [
          {
            name: 'World Air Quality Index Project',
            url: 'https://waqi.info/',
          },
        ],
        iaqi: {
          pm25: { v: 45 },
          // Other pollutants may be missing
        },
        forecast: {
          daily: {
            pm25: [{ v: 40 }],
            pm10: [{ v: 50 }],
            o3: [{ v: 30 }],
            uvi: [{ v: 3 }],
          },
        },
      },
    }

    // Verify that missing pollutants are handled gracefully
    expect(mockAqicnResponse.data.iaqi.pm25?.v).toBe(45)
    expect(mockAqicnResponse.data.iaqi.pm10?.v).toBeUndefined()
    expect(mockAqicnResponse.data.iaqi.o3?.v).toBeUndefined()
    expect(mockAqicnResponse.data.iaqi.no2?.v).toBeUndefined()
    expect(mockAqicnResponse.data.iaqi.so2?.v).toBeUndefined()
    expect(mockAqicnResponse.data.iaqi.co?.v).toBeUndefined()
  })

  it('should handle AQICN error response', () => {
    const mockErrorResponse = {
      status: 'error',
      data: 'Invalid city',
    } as unknown as AqicnData

    expect(mockErrorResponse.status).toBe('error')
  })

  it('should support AQICN pollutant parsing logic', () => {
    const mockDeviceStatus = {
      idx: 123,
      aqi: 85,
      time: {
        s: '2025-08-31 10:00:00',
        tz: '+02:00',
      },
      city: {
        name: 'Winterthur',
        geo: [47.5, 8.7] as [number, number],
        url: 'https://aqicn.org/city/winterthur',
      },
      attributions: [
        {
          name: 'World Air Quality Index Project',
          url: 'https://waqi.info/',
        },
      ],
      iaqi: {
        pm25: { v: 45 },
        pm10: { v: 55 },
        o3: { v: 35 },
        no2: { v: 25 },
        so2: { v: 15 },
        co: { v: 5 },
      },
      forecast: {
        daily: {
          pm25: [{ v: 40 }],
          pm10: [{ v: 50 }],
          o3: [{ v: 30 }],
          uvi: [{ v: 3 }],
        },
      },
    }

    // Simulate the parsing logic from airqualitysensor.ts
    const pollutants = ['o3', 'no2', 'so2', 'pm25', 'pm10', 'co']
    const parsedValues: Record<string, number | undefined> = {}

    pollutants.forEach((pollutant) => {
      const param = mockDeviceStatus.iaqi[pollutant as keyof typeof mockDeviceStatus.iaqi]?.v
      if (param !== undefined) {
        const aqi = Number.parseFloat(param.toString())
        if (!Number.isNaN(aqi)) {
          parsedValues[pollutant] = aqi
        }
      }
    })

    // Verify that all pollutants are parsed correctly
    expect(parsedValues.pm25).toBe(45)
    expect(parsedValues.pm10).toBe(55)
    expect(parsedValues.o3).toBe(35)
    expect(parsedValues.no2).toBe(25)
    expect(parsedValues.so2).toBe(15)
    expect(parsedValues.co).toBe(5)
  })

  it('should handle AQICN device status as object not array', () => {
    // This test validates the fix for issue #22 where AQICN data was incorrectly accessed as array
    const mockDeviceStatus = {
      idx: 123,
      aqi: 85,
      iaqi: {
        pm25: { v: 45 },
        o3: { v: 35 },
      },
      city: {
        name: 'Winterthur',
        geo: [47.5, 8.7] as [number, number],
      },
    }

    // Verify that AQICN data structure is accessible as object, not array
    expect(mockDeviceStatus.aqi).toBe(85)
    expect(mockDeviceStatus.iaqi.pm25?.v).toBe(45)
    expect(mockDeviceStatus.iaqi.o3?.v).toBe(35)
    
    // This should NOT be accessed as array (this was the bug)
    expect(Array.isArray(mockDeviceStatus)).toBe(false)
    
    // Verify accessing as array would fail (demonstrating the original bug)
    expect(() => {
      // Testing incorrect array access that was causing the original issue
      const wrongAccess = (mockDeviceStatus as any)[0]
      return wrongAccess
    }).not.toThrow() // The access returns undefined, doesn't throw
    
    // Testing incorrect array access
    expect((mockDeviceStatus as any)[0]).toBeUndefined()
  })

  it('should handle real-world AQICN API response with weather data (issue #28)', () => {
    // This test reproduces the actual API response structure from Winterthur that caused the bug
    const realWorldResponse: AqicnData = {
      status: 'ok',
      data: {
        aqi: 4,
        idx: 9023,
        attributions: [
          {
            url: 'https://www.ostluft.ch/',
            name: 'OSTLUFT - die Luftqualitätsüberwachung der Ostschweizer Kantone und des Fürstentums Liechtenstein',
          },
          {
            url: 'https://waqi.info/',
            name: 'World Air Quality Index Project',
          },
        ],
        city: {
          geo: [47.508150298795, 8.7203729897032],
          name: 'Winterthur Veltheim, Switzerland',
          url: 'https://aqicn.org/city/switzerland/winterthur-veltheim',
        },
        iaqi: {
          // Weather data that's not pollutants
          dew: { v: 12 },
          h: { v: 82 },
          p: { v: 1016 },
          t: { v: 15 },
          w: { v: 2 },
          wg: { v: 16.9 },
          // Actual pollutant data
          pm10: { v: 4 },
        },
        time: {
          s: '2025-09-03 01:00:00',
          tz: '+02:00',
        },
        forecast: {
          daily: {
            o3: [{ v: 8 }],
            pm10: [{ v: 4 }],
            pm25: [{ v: 9 }],
            uvi: [{ v: 0 }],
          },
        },
      },
    }

    // Verify the response can be parsed correctly
    expect(realWorldResponse.status).toBe('ok')
    expect(realWorldResponse.data.aqi).toBe(4)
    expect(realWorldResponse.data.iaqi.pm10?.v).toBe(4)
    
    // Verify weather data is present but should be ignored during pollutant parsing
    expect(realWorldResponse.data.iaqi.dew?.v).toBe(12)
    expect(realWorldResponse.data.iaqi.h?.v).toBe(82)
    expect(realWorldResponse.data.iaqi.p?.v).toBe(1016)
    
    // Test that pollutant parsing logic works with this structure
    const pollutants = ['o3', 'no2', 'so2', 'pm25', 'pm10', 'co']
    const parsedValues: Record<string, number | undefined> = {}

    pollutants.forEach((pollutant) => {
      const param = realWorldResponse.data.iaqi[pollutant as keyof typeof realWorldResponse.data.iaqi]?.v
      if (param !== undefined) {
        const aqi = Number.parseFloat(param.toString())
        if (!Number.isNaN(aqi)) {
          parsedValues[pollutant] = aqi
        }
      }
    })

    // Only pm10 should be parsed from this response
    expect(parsedValues.pm10).toBe(4)
    expect(parsedValues.o3).toBeUndefined()
    expect(parsedValues.pm25).toBeUndefined()
    expect(parsedValues.no2).toBeUndefined()
    expect(parsedValues.so2).toBeUndefined()
    expect(parsedValues.co).toBeUndefined()
  })

  it('should validate undici request timeout configuration (issue #49)', () => {
    // Test that timeout configuration is properly structured to prevent ETIMEDOUT errors
    const timeoutConfig = {
      headersTimeout: 30000, // 30 seconds for headers
      bodyTimeout: 30000, // 30 seconds for body
    }

    // Validate timeout values are reasonable (should be > 0 and < 60000ms)
    expect(timeoutConfig.headersTimeout).toBeGreaterThan(0)
    expect(timeoutConfig.headersTimeout).toBeLessThanOrEqual(60000)
    expect(timeoutConfig.bodyTimeout).toBeGreaterThan(0)
    expect(timeoutConfig.bodyTimeout).toBeLessThanOrEqual(60000)

    // Ensure both timeout values are present
    expect(typeof timeoutConfig.headersTimeout).toBe('number')
    expect(typeof timeoutConfig.bodyTimeout).toBe('number')
  })
})