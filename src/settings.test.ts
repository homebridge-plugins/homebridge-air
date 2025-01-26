import { describe, expect, it } from 'vitest'

import { HomeKitAQI } from './settings.js'

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
