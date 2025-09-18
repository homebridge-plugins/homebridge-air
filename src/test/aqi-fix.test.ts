import { describe, expect, it } from 'vitest'

import { HomeKitAQI } from '../settings.js'

describe('aQI Bug Fix for Issue #39', () => {
  it('should demonstrate the HomeKitAQI conversion is correct', () => {
    // The issue shows raw AQI: 6 -> HomeKit AQI: 1
    // This is actually correct behavior according to HomeKit scale
    expect(HomeKitAQI(6)).toBe(1) // 0-50 = Excellent (1)
    expect(HomeKitAQI(0)).toBe(1)
    expect(HomeKitAQI(50)).toBe(1)
    expect(HomeKitAQI(51)).toBe(2) // 51-100 = Good (2)
    expect(HomeKitAQI(100)).toBe(2)
    expect(HomeKitAQI(101)).toBe(3) // 101-150 = Fair (3)
    expect(HomeKitAQI(150)).toBe(3)
    expect(HomeKitAQI(151)).toBe(4) // 151-200 = Inferior (4)
    expect(HomeKitAQI(200)).toBe(4)
    expect(HomeKitAQI(201)).toBe(5) // 200+ = Poor (5)
  })

  it('should demonstrate the correct AQICN data structure understanding', () => {
    // Mock response structure from the issue logs
    const winterthurResponse = {
      status: 'ok',
      data: {
        aqi: 6, // <-- This is the OVERALL station AQI
        idx: 9023,
        dominentpol: 'pm10',
        iaqi: {
          dew: { v: 13 }, // Weather data - not pollutants
          h: { v: 87 }, // Weather data - not pollutants
          p: { v: 1017 }, // Weather data - not pollutants
          pm10: { v: 6 }, // <-- This is the individual PM10 measurement
          t: { v: 15 }, // Weather data - not pollutants
          w: { v: 1 }, // Weather data - not pollutants
          wg: { v: 16.9 }, // Weather data - not pollutants
        },
        city: {
          geo: [47.508150298795, 8.7203729897032],
          name: 'Winterthur Veltheim, Switzerland',
          url: 'https://aqicn.org/city/switzerland/winterthur-veltheim',
          location: '',
        },
        time: {
          s: '2025-09-04 01:00:00',
          tz: '+02:00',
          v: 1756947600,
          iso: '2025-09-04T01:00:00+02:00',
        },
      },
    }

    // Verify the data structure
    expect(winterthurResponse.data.aqi).toBe(6)
    expect(winterthurResponse.data.iaqi.pm10?.v).toBe(6)

    // The main AQI (6) should be used for overall air quality determination
    const mainAqi = winterthurResponse.data.aqi
    const expectedHomeKitCategory = HomeKitAQI(mainAqi)
    expect(expectedHomeKitCategory).toBe(1) // This matches the expected behavior

    // The individual pollutant values should be used for specific density characteristics
    const pm10Value = winterthurResponse.data.iaqi.pm10?.v
    expect(pm10Value).toBe(6)

    // Both happen to be 6 in this case, but they represent different things:
    // - mainAqi: Overall air quality index for the station
    // - pm10Value: Specific PM10 particle density measurement
  })

  it('should simulate corrected AQICN parsing behavior', () => {
    // This simulates the corrected parsing logic
    const deviceStatus = {
      aqi: 6, // This should be used for main AirQuality
      iaqi: {
        pm10: { v: 6 }, // This should be used for PM10Density only
        // Other pollutants not available in this response
      },
    }

    // Main AQI should be used for overall air quality
    const mainAqi = deviceStatus.aqi
    const mainAirQuality = HomeKitAQI(Math.max(0, mainAqi))
    expect(mainAirQuality).toBe(1)

    // Individual pollutants should be used for their specific characteristics
    const pollutants = ['o3', 'no2', 'so2', 'pm25', 'pm10', 'co']
    const densityValues: Record<string, number> = {}
    let pollutantCount = 0

    for (const pollutant of pollutants) {
      const param = deviceStatus.iaqi[pollutant as keyof typeof deviceStatus.iaqi]?.v
      if (param !== undefined) {
        const aqi = Number.parseFloat(param.toString())
        if (!Number.isNaN(aqi)) {
          pollutantCount++
          densityValues[pollutant] = aqi
        }
      }
    }

    // Only PM10 should be found
    expect(pollutantCount).toBe(1)
    expect(densityValues.pm10).toBe(6)
    expect(densityValues.o3).toBeUndefined()
    expect(densityValues.pm25).toBeUndefined()

    // The fix ensures that main AQI (6) is used for overall air quality (HomeKit category 1)
    // while PM10 value (6) is used for PM10Density characteristic
    expect(mainAirQuality).toBe(1)
    expect(densityValues.pm10).toBe(6)
  })
})
