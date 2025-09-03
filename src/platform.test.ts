import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AirPlatform } from './platform.js'

// Mock the dependencies
const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

const mockAPI = {
  hap: {
    uuid: {
      generate: vi.fn().mockReturnValue('test-uuid'),
    },
  },
  platformAccessory: vi.fn(),
  registerPlatformAccessories: vi.fn(),
  updatePlatformAccessories: vi.fn(),
  unregisterPlatformAccessories: vi.fn(),
  on: vi.fn(), // Mock the event listener
}

const mockConfig = {
  name: 'Air Quality',
  options: {
    allowInvalidCharacters: false,
  },
}

describe('AirPlatform validateAndCleanDisplayName', () => {
  let platform: AirPlatform

  beforeEach(() => {
    // Create platform instance with mocked dependencies
    platform = new (AirPlatform as any)(mockLog, mockConfig, mockAPI)
    vi.clearAllMocks()
  })

  it('should remove invalid "/" character from device name', async () => {
    const result = await platform.validateAndCleanDisplayName('Update/Restart Failure', 'city', 'Update/Restart Failure')
    expect(result).toBe('UpdateRestart Failure')
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.stringContaining("WARNING: The accessory 'Update/Restart Failure' has an invalid 'city' characteristic ('Update/Restart Failure')")
    )
  })

  it('should remove invalid characters and clean start/end', async () => {
    const result = await platform.validateAndCleanDisplayName('Test Device', 'city', '/Update/Restart/')
    expect(result).toBe('UpdateRestart')
    expect(mockLog.warn).toHaveBeenCalledTimes(3) // warning + invalid chars + start/end cleanup
  })

  it('should return unchanged name for valid characters', async () => {
    const result = await platform.validateAndCleanDisplayName('Valid City', 'city', 'Valid City')
    expect(result).toBe('Valid City')
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('should handle single character names after cleanup', async () => {
    const result = await platform.validateAndCleanDisplayName('Test', 'city', 'A/B')
    expect(result).toBe('AB')
  })

  it('should return original value when allowInvalidCharacters is true', async () => {
    platform.config.options = { allowInvalidCharacters: true }
    const result = await platform.validateAndCleanDisplayName('Test', 'city', 'Update/Restart Failure')
    expect(result).toBe('Update/Restart Failure')
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('should handle multiple consecutive invalid characters', async () => {
    const result = await platform.validateAndCleanDisplayName('Test', 'city', 'Update///Restart***Failure')
    expect(result).toBe('UpdateRestartFailure')
    expect(mockLog.warn).toHaveBeenCalled()
  })
})