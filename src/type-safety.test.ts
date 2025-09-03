import { describe, expect, it } from 'vitest'

import type { AqicnData } from './settings.js'

describe('AqicnData interface type safety improvement', () => {
  it('should allow known weather properties with proper typing', () => {
    const mockAqicnResponseWithWeather: AqicnData = {
      status: 'ok',
      data: {
        idx: 9023,
        aqi: 4,
        time: {
          s: '2025-09-03 01:00:00',
          tz: '+02:00',
        },
        city: {
          name: 'Winterthur Veltheim, Switzerland',
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
          // Air quality pollutants
          pm25: { v: 9 },
          pm10: { v: 4 },
          o3: { v: 8 },
          no2: { v: 15 },
          so2: { v: 2 },
          co: { v: 1 },
          // Weather properties with explicit typing
          dew: { v: 12 },
          h: { v: 82 },
          p: { v: 1016 },
          t: { v: 15 },
          w: { v: 2 },
          wg: { v: 16.9 },
        },
        forecast: {
          daily: {
            pm25: [{ v: 9 }],
            pm10: [{ v: 4 }],
            o3: [{ v: 8 }],
            uvi: [{ v: 0 }],
          },
        },
      },
    }

    // Verify that all properties can be accessed with proper typing
    expect(mockAqicnResponseWithWeather.data.iaqi.pm25?.v).toBe(9)
    expect(mockAqicnResponseWithWeather.data.iaqi.pm10?.v).toBe(4)
    expect(mockAqicnResponseWithWeather.data.iaqi.o3?.v).toBe(8)
    expect(mockAqicnResponseWithWeather.data.iaqi.no2?.v).toBe(15)
    expect(mockAqicnResponseWithWeather.data.iaqi.so2?.v).toBe(2)
    expect(mockAqicnResponseWithWeather.data.iaqi.co?.v).toBe(1)

    // Weather properties
    expect(mockAqicnResponseWithWeather.data.iaqi.dew?.v).toBe(12)
    expect(mockAqicnResponseWithWeather.data.iaqi.h?.v).toBe(82)
    expect(mockAqicnResponseWithWeather.data.iaqi.p?.v).toBe(1016)
    expect(mockAqicnResponseWithWeather.data.iaqi.t?.v).toBe(15)
    expect(mockAqicnResponseWithWeather.data.iaqi.w?.v).toBe(2)
    expect(mockAqicnResponseWithWeather.data.iaqi.wg?.v).toBe(16.9)
  })

  it('should work with existing pollutant parsing logic', () => {
    const mockDeviceStatus = {
      iaqi: {
        pm25: { v: 45 },
        pm10: { v: 55 },
        o3: { v: 35 },
        no2: { v: 25 },
        so2: { v: 15 },
        co: { v: 5 },
        // Weather data that should be ignored during pollutant parsing
        dew: { v: 12 },
        h: { v: 82 },
        p: { v: 1016 },
        t: { v: 15 },
        w: { v: 2 },
        wg: { v: 16.9 },
      },
    }

    // Simulate the pollutant parsing logic from airqualitysensor.ts
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

    // Verify that all pollutants are correctly parsed
    expect(parsedValues.pm25).toBe(45)
    expect(parsedValues.pm10).toBe(55)
    expect(parsedValues.o3).toBe(35)
    expect(parsedValues.no2).toBe(25)
    expect(parsedValues.so2).toBe(15)
    expect(parsedValues.co).toBe(5)

    // Weather properties should be accessible but not included in pollutant parsing
    expect(mockDeviceStatus.iaqi.dew?.v).toBe(12)
    expect(mockDeviceStatus.iaqi.h?.v).toBe(82)
  })

  it('should maintain backward compatibility with minimal pollutant data', () => {
    const mockMinimalResponse: AqicnData = {
      status: 'ok',
      data: {
        idx: 123,
        aqi: 85,
        time: {
          s: '2025-09-03 10:00:00',
          tz: '+02:00',
        },
        city: {
          name: 'Test City',
          geo: [47.5, 8.7],
          url: 'https://aqicn.org/city/test',
        },
        attributions: [
          {
            name: 'Test Attribution',
            url: 'https://test.info/',
          },
        ],
        iaqi: {
          pm25: { v: 45 },
          // Other properties may be undefined/missing
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

    // Should work with minimal data
    expect(mockMinimalResponse.data.iaqi.pm25?.v).toBe(45)
    expect(mockMinimalResponse.data.iaqi.pm10?.v).toBeUndefined()
    expect(mockMinimalResponse.data.iaqi.dew?.v).toBeUndefined()
  })
})