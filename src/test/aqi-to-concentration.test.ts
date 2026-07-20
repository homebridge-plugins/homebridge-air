import { describe, expect, it } from 'vitest'

import { aqiToConcentration } from '../settings.js'

describe('aqiToConcentration', () => {
  it('converts a pm25 sub-index back to µg/m³', () => {
    // AQI 82 sits in the 51-100 band (9.1-35.4 µg/m³). The reporter in #77 saw
    // 82 shown where the station was really reading about 27 µg/m³, so the
    // recovered value should land near that rather than near 82.
    expect(aqiToConcentration('pm25', 82)).toBeCloseTo(25.74, 1)
  })

  it('returns the band floor at the bottom of a band', () => {
    expect(aqiToConcentration('pm25', 51)).toBe(9.1)
    expect(aqiToConcentration('pm10', 51)).toBe(55)
  })

  it('returns the band ceiling at the top of a band', () => {
    expect(aqiToConcentration('pm25', 100)).toBe(35.4)
    expect(aqiToConcentration('pm10', 100)).toBe(154)
  })

  it('never returns the index itself for a mid-range value', () => {
    // The bug in #77 was writing the index straight through
    expect(aqiToConcentration('pm25', 82)).not.toBe(82)
    expect(aqiToConcentration('pm10', 82)).not.toBe(82)
  })

  it('converts ozone from ppm into µg/m³', () => {
    // AQI 50 is 0.054 ppm, which is roughly 106 µg/m³
    expect(aqiToConcentration('o3', 50)).toBeCloseTo(105.98, 0)
  })

  it('converts nitrogen dioxide from ppb into µg/m³', () => {
    // AQI 50 is 53 ppb, which is roughly 100 µg/m³
    expect(aqiToConcentration('no2', 50)).toBeCloseTo(99.72, 0)
  })

  it('converts sulphur dioxide from ppb into µg/m³', () => {
    // AQI 50 is 35 ppb, which is roughly 92 µg/m³
    expect(aqiToConcentration('so2', 50)).toBeCloseTo(91.71, 0)
  })

  it('leaves carbon monoxide in ppm, as HomeKit expects', () => {
    expect(aqiToConcentration('co', 50)).toBe(4.4)
    expect(aqiToConcentration('co', 100)).toBe(9.4)
  })

  it('handles zero', () => {
    expect(aqiToConcentration('pm25', 0)).toBe(0)
  })

  it('rejects values that cannot be converted', () => {
    expect(aqiToConcentration('pm25', undefined)).toBeUndefined()
    expect(aqiToConcentration('pm25', Number.NaN)).toBeUndefined()
    expect(aqiToConcentration('pm25', -1)).toBeUndefined()
  })

  it('rejects an index above the top breakpoint', () => {
    // Ozone breakpoints stop at 300; there is nothing to convert past that
    expect(aqiToConcentration('o3', 400)).toBeUndefined()
    expect(aqiToConcentration('pm25', 600)).toBeUndefined()
  })

  it('rises monotonically with the index', () => {
    let previous = -1
    for (let aqi = 0; aqi <= 300; aqi += 10) {
      const value = aqiToConcentration('pm25', aqi)
      expect(value).toBeDefined()
      expect(value!).toBeGreaterThan(previous)
      previous = value!
    }
  })
})
