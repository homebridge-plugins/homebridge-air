import { describe, expect, it } from 'vitest'

import { AqicnUrl, HomeKitAQI, REQUEST_TIMEOUT_CONFIG } from './settings.js'

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

describe('URL construction for AQICN API (issue #49)', () => {
  it('should construct HTTPS URLs for AQICN API requests', () => {
    // Verify the base URL uses HTTPS
    expect(AqicnUrl).toBe('https://api.waqi.info/feed/')
    
    // Test URL construction for the scenario mentioned in issue #49
    const cityId = 'A92323'
    const token = 'myToken'
    const expectedUrl = `https://api.waqi.info/feed/${cityId}/?token=${token}`
    const constructedUrl = `${AqicnUrl}${cityId}/?token=${token}`
    
    expect(constructedUrl).toBe(expectedUrl)
    expect(constructedUrl).toMatch(/^https:\/\//)
  })
})

describe('REQUEST_TIMEOUT_CONFIG constants', () => {
  it('should have properly defined timeout constants', () => {
    expect(REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT).toBe(30000)
    expect(REQUEST_TIMEOUT_CONFIG.MAX_RETRY_TIMEOUT).toBe(30000)
    expect(REQUEST_TIMEOUT_CONFIG.MIN_RETRY_TIMEOUT).toBe(500)
    expect(REQUEST_TIMEOUT_CONFIG.IDLE_TIMEOUT).toBe(4000)
  })

  it('should have timeout values that make logical sense', () => {
    // Default timeout should be reasonable (30 seconds)
    expect(REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT).toBeGreaterThan(0)
    expect(REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT).toBeLessThanOrEqual(60000) // No more than 1 minute
    
    // Min retry timeout should be less than max retry timeout
    expect(REQUEST_TIMEOUT_CONFIG.MIN_RETRY_TIMEOUT).toBeLessThan(REQUEST_TIMEOUT_CONFIG.MAX_RETRY_TIMEOUT)
    
    // Idle timeout should be shorter than default timeout
    expect(REQUEST_TIMEOUT_CONFIG.IDLE_TIMEOUT).toBeLessThan(REQUEST_TIMEOUT_CONFIG.DEFAULT_TIMEOUT)
  })
})
