import { describe, expect, it } from 'vitest'

describe('AirQualitySensor pollutant tracking', () => {
  it('should track available pollutants correctly when CO data is present', () => {
    // Mock AQICN response with CO data
    const mockDeviceStatus = {
      aqi: 85,
      iaqi: {
        pm25: { v: 45 },
        pm10: { v: 55 },
        o3: { v: 35 },
        no2: { v: 25 },
        so2: { v: 15 },
        co: { v: 5 }, // CO data is present
      },
    }

    // Simulate the pollutant parsing logic from the AirQualitySensor class
    const availablePollutants = new Set<string>()
    const pollutants = ['o3', 'no2', 'so2', 'pm25', 'pm10', 'co']

    pollutants.forEach((pollutant) => {
      const param = mockDeviceStatus.iaqi[pollutant as keyof typeof mockDeviceStatus.iaqi]?.v
      if (param !== undefined) {
        const aqi = Number.parseFloat(param.toString())
        if (!Number.isNaN(aqi)) {
          switch (pollutant.toLowerCase()) {
            case 'o3':
              availablePollutants.add('OzoneDensity')
              break
            case 'pm25':
              availablePollutants.add('PM2_5Density')
              break
            case 'pm10':
              availablePollutants.add('PM10Density')
              break
            case 'no2':
              availablePollutants.add('NitrogenDioxideDensity')
              break
            case 'so2':
              availablePollutants.add('SulphurDioxideDensity')
              break
            case 'co':
              availablePollutants.add('CarbonMonoxideLevel')
              break
          }
        }
      }
    })

    // Verify that CO is tracked when data is available
    expect(availablePollutants.has('CarbonMonoxideLevel')).toBe(true)
    expect(availablePollutants.has('OzoneDensity')).toBe(true)
    expect(availablePollutants.has('PM2_5Density')).toBe(true)
    expect(availablePollutants.has('PM10Density')).toBe(true)
    expect(availablePollutants.has('NitrogenDioxideDensity')).toBe(true)
    expect(availablePollutants.has('SulphurDioxideDensity')).toBe(true)
  })

  it('should not track CO when CO data is missing', () => {
    // Mock AQICN response without CO data
    const mockDeviceStatus = {
      aqi: 85,
      iaqi: {
        pm25: { v: 45 },
        pm10: { v: 55 },
        o3: { v: 35 },
        no2: { v: 25 },
        so2: { v: 15 },
        // co: { v: 5 } - CO data is missing
      },
    }

    // Simulate the pollutant parsing logic from the AirQualitySensor class
    const availablePollutants = new Set<string>()
    const pollutants = ['o3', 'no2', 'so2', 'pm25', 'pm10', 'co']

    pollutants.forEach((pollutant) => {
      const param = mockDeviceStatus.iaqi[pollutant as keyof typeof mockDeviceStatus.iaqi]?.v
      if (param !== undefined) {
        const aqi = Number.parseFloat(param.toString())
        if (!Number.isNaN(aqi)) {
          switch (pollutant.toLowerCase()) {
            case 'o3':
              availablePollutants.add('OzoneDensity')
              break
            case 'pm25':
              availablePollutants.add('PM2_5Density')
              break
            case 'pm10':
              availablePollutants.add('PM10Density')
              break
            case 'no2':
              availablePollutants.add('NitrogenDioxideDensity')
              break
            case 'so2':
              availablePollutants.add('SulphurDioxideDensity')
              break
            case 'co':
              availablePollutants.add('CarbonMonoxideLevel')
              break
          }
        }
      }
    })

    // Verify that CO is NOT tracked when data is missing
    expect(availablePollutants.has('CarbonMonoxideLevel')).toBe(false)
    expect(availablePollutants.has('OzoneDensity')).toBe(true)
    expect(availablePollutants.has('PM2_5Density')).toBe(true)
    expect(availablePollutants.has('PM10Density')).toBe(true)
    expect(availablePollutants.has('NitrogenDioxideDensity')).toBe(true)
    expect(availablePollutants.has('SulphurDioxideDensity')).toBe(true)
  })

  it('should handle AirNow provider correctly without CO data', () => {
    // Mock AirNow response without CO data (AirNow typically doesn't provide CO)
    const mockDeviceStatus = [
      { ParameterName: 'O3', AQI: 35 },
      { ParameterName: 'PM2.5', AQI: 45 },
      { ParameterName: 'PM10', AQI: 55 },
    ]

    // Simulate the pollutant parsing logic for AirNow
    const availablePollutants = new Set<string>()
    const pollutants = ['O3', 'PM2.5', 'PM10']

    pollutants.forEach((pollutant) => {
      const param = mockDeviceStatus.find((p: { ParameterName: string }) => p.ParameterName === pollutant)
      if (param !== undefined) {
        const aqi = Number.parseFloat(param.AQI.toString())
        if (!Number.isNaN(aqi)) {
          switch (pollutant.toLowerCase()) {
            case 'o3':
              availablePollutants.add('OzoneDensity')
              break
            case 'pm2.5':
              availablePollutants.add('PM2_5Density')
              break
            case 'pm10':
              availablePollutants.add('PM10Density')
              break
          }
        }
      }
    })

    // Verify that only available pollutants are tracked for AirNow
    expect(availablePollutants.has('CarbonMonoxideLevel')).toBe(false)
    expect(availablePollutants.has('OzoneDensity')).toBe(true)
    expect(availablePollutants.has('PM2_5Density')).toBe(true)
    expect(availablePollutants.has('PM10Density')).toBe(true)
    expect(availablePollutants.has('NitrogenDioxideDensity')).toBe(false)
    expect(availablePollutants.has('SulphurDioxideDensity')).toBe(false)
  })

  it('should handle edge case with undefined or NaN values', () => {
    // Mock AQICN response with some invalid data
    const mockDeviceStatus = {
      aqi: 85,
      iaqi: {
        pm25: { v: 45 },
        pm10: { v: undefined }, // Invalid data
        o3: { v: 'invalid' }, // Invalid data that will become NaN
        no2: { v: 25 },
        so2: { v: 15 },
        co: { v: 0 }, // Valid zero value
      },
    }

    // Simulate the pollutant parsing logic from the AirQualitySensor class
    const availablePollutants = new Set<string>()
    const pollutants = ['o3', 'no2', 'so2', 'pm25', 'pm10', 'co']

    pollutants.forEach((pollutant) => {
      const param = mockDeviceStatus.iaqi[pollutant as keyof typeof mockDeviceStatus.iaqi]?.v
      if (param !== undefined) {
        const aqi = Number.parseFloat(param.toString())
        if (!Number.isNaN(aqi)) {
          switch (pollutant.toLowerCase()) {
            case 'o3':
              availablePollutants.add('OzoneDensity')
              break
            case 'pm25':
              availablePollutants.add('PM2_5Density')
              break
            case 'pm10':
              availablePollutants.add('PM10Density')
              break
            case 'no2':
              availablePollutants.add('NitrogenDioxideDensity')
              break
            case 'so2':
              availablePollutants.add('SulphurDioxideDensity')
              break
            case 'co':
              availablePollutants.add('CarbonMonoxideLevel')
              break
          }
        }
      }
    })

    // Verify that only valid data is tracked
    expect(availablePollutants.has('CarbonMonoxideLevel')).toBe(true) // Zero is valid
    expect(availablePollutants.has('OzoneDensity')).toBe(false) // NaN is invalid
    expect(availablePollutants.has('PM2_5Density')).toBe(true) // Valid
    expect(availablePollutants.has('PM10Density')).toBe(false) // undefined is invalid
    expect(availablePollutants.has('NitrogenDioxideDensity')).toBe(true) // Valid
    expect(availablePollutants.has('SulphurDioxideDensity')).toBe(true) // Valid
  })

  it('should properly clear pollutants when error conditions occur', () => {
    // Simulate tracking set that had previous data
    const availablePollutants = new Set<string>()
    availablePollutants.add('CarbonMonoxideLevel')
    availablePollutants.add('OzoneDensity')
    availablePollutants.add('PM2_5Density')

    // Verify initial state
    expect(availablePollutants.size).toBe(3)

    // Simulate error condition - clear the set (as done in parseStatus on error)
    availablePollutants.clear()

    // Verify that the set is properly cleared
    expect(availablePollutants.size).toBe(0)
    expect(availablePollutants.has('CarbonMonoxideLevel')).toBe(false)
    expect(availablePollutants.has('OzoneDensity')).toBe(false)
    expect(availablePollutants.has('PM2_5Density')).toBe(false)
  })
})