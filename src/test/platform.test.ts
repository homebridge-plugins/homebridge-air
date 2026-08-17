import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AirPlatform } from '../platform.js'

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
  matter: {
    unregisterPlatformAccessories: vi.fn(),
  },
  on: vi.fn(), // Mock the event listener
}

const mockConfig = {
  name: 'Air Quality',
  options: {
    allowInvalidCharacters: false,
  },
}

describe('airPlatform validateAndCleanDisplayName', () => {
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
      expect.stringContaining('WARNING: The accessory \'Update/Restart Failure\' has an invalid \'city\' characteristic (\'Update/Restart Failure\')'),
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

  it('should handle AQICN station ID format without warnings', async () => {
    const result = await platform.validateAndCleanDisplayName('/station/@92323', 'city', '/station/@92323', 'aqicn')
    expect(result).toBe('Station 92323')
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('should handle AQICN station name format', async () => {
    const result = await platform.validateAndCleanDisplayName('/station/winterthur-veltheim/switzerland', 'city', '/station/winterthur-veltheim/switzerland', 'aqicn')
    expect(result).toBe('Winterthur Veltheim Switzerland')
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('should handle AQICN city path format', async () => {
    const result = await platform.validateAndCleanDisplayName('/city/switzerland/zurich', 'city', '/city/switzerland/zurich', 'aqicn')
    expect(result).toBe('Switzerland Zurich')
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('should handle regular AQICN city names normally', async () => {
    const result = await platform.validateAndCleanDisplayName('Zurich', 'city', 'Zurich', 'aqicn')
    expect(result).toBe('Zurich')
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('should still validate non-AQICN providers normally', async () => {
    const result = await platform.validateAndCleanDisplayName('/station/@92323', 'city', '/station/@92323', 'airnow')
    expect(result).toBe('station92323')
    expect(mockLog.warn).toHaveBeenCalled()
  })

  it('should still validate non-city fields normally for AQICN', async () => {
    const result = await platform.validateAndCleanDisplayName('/station/@92323', 'name', '/station/@92323', 'aqicn')
    expect(result).toBe('station92323')
    expect(mockLog.warn).toHaveBeenCalled()
  })
})

describe('airPlatform generateAqicnDisplayName', () => {
  let platform: AirPlatform

  beforeEach(() => {
    platform = new (AirPlatform as any)(mockLog, mockConfig, mockAPI)
    vi.clearAllMocks()
  })

  it('should convert station ID format to readable name', () => {
    const result = platform.generateAqicnDisplayName('/station/@92323')
    expect(result).toBe('Station 92323')
  })

  it('should convert station name format to readable name', () => {
    const result = platform.generateAqicnDisplayName('/station/winterthur-veltheim/switzerland')
    expect(result).toBe('Winterthur Veltheim Switzerland')
  })

  it('should convert city path format to readable name', () => {
    const result = platform.generateAqicnDisplayName('/city/switzerland/zurich-airport')
    expect(result).toBe('Switzerland Zurich Airport')
  })

  it('should handle single word station names', () => {
    const result = platform.generateAqicnDisplayName('/station/zurich')
    expect(result).toBe('Zurich')
  })

  it('should return regular city names unchanged', () => {
    const result = platform.generateAqicnDisplayName('Zurich')
    expect(result).toBe('Zurich')
  })

  it('should handle empty string', () => {
    const result = platform.generateAqicnDisplayName('')
    expect(result).toBe('')
  })
})

describe('airPlatform matter fallback cleanup', () => {
  let platform: AirPlatform

  beforeEach(() => {
    platform = new (AirPlatform as any)(mockLog, mockConfig, mockAPI)
    vi.clearAllMocks()
  })

  it('should unregister stale matter accessory while in HAP mode', async () => {
    const staleAccessory = {
      UUID: 'matter-uuid-1',
      displayName: 'Matter Device 1',
    }

    platform.configureMatterAccessory(staleAccessory as any)

    // configureMatterAccessory kicks off async cleanup without awaiting.
    await Promise.resolve()
    await Promise.resolve()

    expect(mockAPI.matter.unregisterPlatformAccessories).toHaveBeenCalledWith(
      '@homebridge-plugins/homebridge-air',
      'Air',
      [staleAccessory],
    )
  })
})

describe('airPlatform verifyConfig provider validation', () => {
  let platform: AirPlatform

  beforeEach(() => {
    platform = new (AirPlatform as any)(mockLog, mockConfig, mockAPI)
    vi.clearAllMocks()
  })

  it('should require AirNow location as zip+city or lat+lon', async () => {
    platform.config.devices = [
      {
        provider: 'airnow',
        apiKey: 'test-key',
        city: undefined,
        zipCode: undefined,
        latitude: undefined,
        longitude: undefined,
      } as any,
    ]

    const errorSpy = vi.spyOn(platform, 'errorLog').mockResolvedValue(undefined)
    await platform.verifyConfig()

    expect(errorSpy).toHaveBeenCalledWith('AirNow requires either (zipCode + city) or (latitude + longitude)')
  })

  it('should allow AQICN with city path and no coordinates', async () => {
    platform.config.devices = [
      {
        provider: 'aqicn',
        apiKey: 'test-key',
        city: '/station/@92323',
      } as any,
    ]

    const errorSpy = vi.spyOn(platform, 'errorLog').mockResolvedValue(undefined)
    await platform.verifyConfig()

    expect(errorSpy).not.toHaveBeenCalledWith('AQICN requires either city/station path/URL or (latitude + longitude)')
  })

  it('should report missing longitude when only latitude is provided', async () => {
    platform.config.devices = [
      {
        provider: 'airnow',
        apiKey: 'test-key',
        latitude: 47.5,
      } as any,
    ]

    const errorSpy = vi.spyOn(platform, 'errorLog').mockResolvedValue(undefined)
    await platform.verifyConfig()

    expect(errorSpy).toHaveBeenCalledWith('Missing your Longitude')
  })
})

describe('airPlatform removeStaleAccessories', () => {
  let platform: AirPlatform

  beforeEach(() => {
    platform = new (AirPlatform as any)(mockLog, mockConfig, mockAPI)
    vi.clearAllMocks()
  })

  it('should unregister cached accessories that are no longer configured (#49)', async () => {
    const configured = { UUID: 'configured-uuid', displayName: 'Winterthur' } as any
    const stale = { UUID: 'stale-uuid', displayName: 'Unknown' } as any
    platform.accessories.push(configured, stale)

    await (platform as any).removeStaleAccessories(new Set(['configured-uuid']))

    expect(mockAPI.unregisterPlatformAccessories).toHaveBeenCalledTimes(1)
    expect(mockAPI.unregisterPlatformAccessories).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      [stale],
    )
    // the removed accessory should no longer be tracked
    expect(platform.accessories).toEqual([configured])
  })

  it('should keep accessories that are still configured', async () => {
    const configured = { UUID: 'configured-uuid', displayName: 'Winterthur' } as any
    platform.accessories.push(configured)

    await (platform as any).removeStaleAccessories(new Set(['configured-uuid']))

    expect(mockAPI.unregisterPlatformAccessories).not.toHaveBeenCalled()
    expect(platform.accessories).toEqual([configured])
  })

  it('should remove every cached accessory when no devices are configured', async () => {
    const first = { UUID: 'a', displayName: 'A' } as any
    const second = { UUID: 'b', displayName: 'B' } as any
    platform.accessories.push(first, second)

    await (platform as any).removeStaleAccessories(new Set<string>())

    expect(mockAPI.unregisterPlatformAccessories).toHaveBeenCalledTimes(2)
    expect(platform.accessories).toEqual([])
  })
})

describe('airPlatform generateSerialNumber', () => {
  let platform: AirPlatform

  beforeEach(() => {
    platform = new (AirPlatform as any)(mockLog, mockConfig, mockAPI)
    vi.clearAllMocks()
  })

  it('should use the zip code for airnow devices', () => {
    const serial = platform.generateSerialNumber({ provider: 'airnow', zipCode: '90210' })
    expect(serial).toBe('90210')
  })

  it('should use the station id for aqicn community sensors (#49)', () => {
    const serial = platform.generateSerialNumber({
      provider: 'aqicn',
      city: 'https://aqicn.org/station/@92323/',
      zipCode: '00000',
    })
    expect(serial).toBe('A92323')
  })

  it('should use the city name for aqicn city devices', () => {
    const serial = platform.generateSerialNumber({ provider: 'aqicn', city: 'winterthur', zipCode: '00000' })
    expect(serial).toBe('winterthur')
  })

  it('should give aqicn devices distinct serial numbers', () => {
    const first = platform.generateSerialNumber({ provider: 'aqicn', city: 'station/@92323', zipCode: '00000' })
    const second = platform.generateSerialNumber({ provider: 'aqicn', city: 'station/@524776', zipCode: '00000' })
    expect(first).not.toBe(second)
  })

  it('should identify a device by its coordinates when one of them is zero', () => {
    const generate = mockAPI.hap.uuid.generate as any
    platform.generateAccessoryUUID({ provider: 'airnow', latitude: 51.4779, longitude: 0, zipCode: '00000', city: 'Unknown' })
    expect(generate).toHaveBeenCalledWith('51.47790airnow')
  })

  it('should fall back to 00000 when an aqicn device has no location at all', () => {
    const serial = platform.generateSerialNumber({ provider: 'aqicn', city: '', zipCode: '00000' })
    expect(serial).toBe('00000')
  })
})

describe('airPlatform resolveDisplayName', () => {
  let platform: AirPlatform

  beforeEach(() => {
    platform = new (AirPlatform as any)(mockLog, mockConfig, mockAPI)
    vi.clearAllMocks()
  })

  it('should keep using an adopted station name across restarts (#69)', async () => {
    const accessory = { context: { providerName: 'Kirchackerstrasse' } } as any
    const device = { provider: 'aqicn', city: 'https://aqicn.org/station/@92323/' }

    expect(await platform.resolveDisplayName(device, accessory)).toBe('Kirchackerstrasse')
  })

  it('should keep the existing name when no station name was ever adopted (#69)', async () => {
    // Accessories added before this feature must not be renamed - their
    // current name was the user's decision
    const accessory = { context: {} } as any
    const device = { provider: 'aqicn', city: 'https://aqicn.org/station/@92323/' }

    expect(await platform.resolveDisplayName(device, accessory)).toBe('Station 92323')
  })

  it('should still name airnow devices from their city', async () => {
    const accessory = { context: {} } as any
    const device = { provider: 'airnow', city: 'Winterthur', zipCode: '8400' }

    expect(await platform.resolveDisplayName(device, accessory)).toBe('Winterthur')
  })

  it('should prefer the name from the config over an adopted station name', async () => {
    const accessory = { context: { providerName: 'Kelowna KLO Road British Comlumbia' } } as any
    const device = { provider: 'aqicn', city: 'Kelowna', configDeviceName: 'Kelowna' }

    expect(await platform.resolveDisplayName(device, accessory)).toBe('Kelowna')
  })

  it('should prefer the name from the config over the city', async () => {
    const accessory = { context: {} } as any
    const device = { provider: 'airnow', city: 'Winterthur', configDeviceName: 'Upstairs Air' }

    expect(await platform.resolveDisplayName(device, accessory)).toBe('Upstairs Air')
  })

  it('should ignore a name that is only whitespace', async () => {
    const accessory = { context: {} } as any
    const device = { provider: 'airnow', city: 'Winterthur', configDeviceName: '   ' }

    expect(await platform.resolveDisplayName(device, accessory)).toBe('Winterthur')
  })

  it('should clean invalid characters out of the name from the config', async () => {
    const accessory = { context: {} } as any
    const device = { provider: 'airnow', city: 'Winterthur', configDeviceName: 'Up/Stairs' }

    expect(await platform.resolveDisplayName(device, accessory)).toBe('UpStairs')
  })

  it('should name a brand new accessory without any context', async () => {
    const device = { provider: 'aqicn', city: 'Kelowna', configDeviceName: 'Kelowna' }

    expect(await platform.resolveDisplayName(device)).toBe('Kelowna')
  })
})
