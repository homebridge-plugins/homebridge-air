/**
 * Naming a Matter accessory (#94).
 *
 * The Matter path resolves a display name on every discovery pass but used to
 * apply it only when registering a brand new accessory. That was invisible while
 * the name could only come from the city, and wrong as soon as the config could
 * name a device: a Device Name added to an accessory that already existed
 * reached the log line and nothing else.
 */
import type { API, Logging, MatterAccessory } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { AirMatterPlatform } from '../AirMatterPlatform.js'

// The real sensor starts polling the provider from its constructor
vi.mock('../devices/airqualitysensormatter.js', () => ({
  AirQualitySensorMatter: vi.fn(),
}))

function makeLog(): Logging {
  const log = vi.fn() as unknown as Logging
  log.info = vi.fn()
  log.success = vi.fn()
  log.warn = vi.fn()
  log.error = vi.fn()
  log.debug = vi.fn()
  return log
}

function makePlatform() {
  const matter = {
    registerPlatformAccessories: vi.fn(),
    updatePlatformAccessories: vi.fn(),
    unregisterPlatformAccessories: vi.fn(),
  }

  const api = {
    hap: { uuid: { generate: vi.fn().mockReturnValue('test-uuid') } },
    isMatterAvailable: () => true,
    isMatterEnabled: () => true,
    matter,
    on: vi.fn(),
  } as unknown as API

  const platform = new AirMatterPlatform(makeLog(), { platform: 'Air', options: {} } as any, api)

  return { platform, matter }
}

function cachedAccessory(displayName: string): MatterAccessory {
  return { UUID: 'test-uuid', displayName, context: {} } as unknown as MatterAccessory
}

describe('matter accessory naming', () => {
  it('names a new accessory from the config', async () => {
    const { platform, matter } = makePlatform()

    await platform.createMatterAirQualitySensor({ provider: 'aqicn', city: 'station/@92323', configDeviceName: 'Kelowna' })

    expect(matter.registerPlatformAccessories).toHaveBeenCalled()
    expect(platform.matterAccessories.get('test-uuid')?.displayName).toBe('Kelowna')
  })

  it('renames an accessory it has already registered', async () => {
    const { platform, matter } = makePlatform()
    const existing = cachedAccessory('Station 92323')
    platform.configureMatterAccessory(existing)

    await platform.createMatterAirQualitySensor({ provider: 'aqicn', city: 'station/@92323', configDeviceName: 'Kelowna' })

    expect(existing.displayName).toBe('Kelowna')
    expect(matter.updatePlatformAccessories).toHaveBeenCalledWith([existing])
    expect(matter.registerPlatformAccessories).not.toHaveBeenCalled()
  })

  it('hands naming back to the city when the config name is cleared', async () => {
    const { platform } = makePlatform()
    const existing = cachedAccessory('Kelowna')
    platform.configureMatterAccessory(existing)

    await platform.createMatterAirQualitySensor({ provider: 'aqicn', city: 'station/@92323' })

    expect(existing.displayName).toBe('Station 92323')
  })

  it('still clamps a long name to Matter\'s 32 character limit', async () => {
    const { platform } = makePlatform()
    const existing = cachedAccessory('Station 92323')
    platform.configureMatterAccessory(existing)

    await platform.createMatterAirQualitySensor({
      provider: 'aqicn',
      city: 'station/@92323',
      configDeviceName: 'Kelowna KLO Road British Comlumbia',
    })

    expect(existing.displayName).toBe('Kelowna KLO Road British Comlumb')
  })
})
