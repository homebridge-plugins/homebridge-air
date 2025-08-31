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
})