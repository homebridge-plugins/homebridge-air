/**
 * How an accessory is named when the config names it (#94).
 *
 * The interesting part is what happens to `context.nameFromProvider`. It is set
 * once, when the accessory is created, and only the station-name adoption in
 * `applyProviderStationName` clears it. Disarming it because the config happens
 * to name the device would make the Device Name a one-way door: clearing the
 * field again would leave an AQICN station id showing as 'Station 92323' with no
 * way back short of deleting the accessory.
 */
import type { API, Logging } from 'homebridge'

import { describe, expect, it, vi } from 'vitest'

import { AirPlatform } from '../platform.js'

// The real sensor starts polling the provider from its constructor
vi.mock('../devices/airqualitysensor.js', () => ({
  AirQualitySensor: vi.fn(),
}))

class FakeAccessory {
  public displayName: string
  public UUID: string
  public context: Record<string, any> = {}
  public updateDisplayName = vi.fn((name: string) => {
    this.displayName = name
  })

  constructor(displayName: string, uuid: string) {
    this.displayName = displayName
    this.UUID = uuid
  }
}

function makeLog(): Logging {
  const log = vi.fn() as unknown as Logging
  log.info = vi.fn()
  log.success = vi.fn()
  log.warn = vi.fn()
  log.error = vi.fn()
  log.debug = vi.fn()
  return log
}

/**
 * `createAirQualitySensor` only needs the platform's api, config and accessory
 * list, so it can be exercised without running the constructor.
 */
function makePlatform() {
  const api = {
    hap: { uuid: { generate: vi.fn().mockReturnValue('test-uuid') } },
    platformAccessory: FakeAccessory,
    registerPlatformAccessories: vi.fn(),
    updatePlatformAccessories: vi.fn(),
    unregisterPlatformAccessories: vi.fn(),
  } as unknown as API

  const platform: any = Object.create(AirPlatform.prototype)
  platform.api = api
  platform.log = makeLog()
  platform.platformLogging = 'standard'
  platform.config = { options: { allowInvalidCharacters: false } }
  platform.accessories = []

  return { platform, api }
}

function restoredAccessory(displayName: string, context: Record<string, any> = {}) {
  const accessory = new FakeAccessory(displayName, 'test-uuid')
  accessory.context = context
  return accessory
}

describe('naming a new accessory', () => {
  it('uses the name from the config', async () => {
    const { platform } = makePlatform()

    await platform.createAirQualitySensor({ provider: 'aqicn', city: 'station/@92323', configDeviceName: 'Kelowna' })

    expect(platform.accessories).toHaveLength(1)
    expect(platform.accessories[0].displayName).toBe('Kelowna')
  })

  it('stays ready to adopt a station name even when the config names it', async () => {
    const { platform } = makePlatform()

    await platform.createAirQualitySensor({ provider: 'aqicn', city: 'station/@92323', configDeviceName: 'Kelowna' })

    expect(platform.accessories[0].context.nameFromProvider).toBe(true)
  })

  it('falls back to the city when the config does not name it (#69)', async () => {
    const { platform } = makePlatform()

    await platform.createAirQualitySensor({ provider: 'aqicn', city: 'station/@92323' })

    expect(platform.accessories[0].displayName).toBe('Station 92323')
    expect(platform.accessories[0].context.nameFromProvider).toBe(true)
  })
})

describe('naming a restored accessory', () => {
  it('renames one that had adopted a station name', async () => {
    const { platform } = makePlatform()
    const existing = restoredAccessory('Kelowna KLO Road British Comlumbia', { providerName: 'Kelowna KLO Road British Comlumbia' })
    platform.accessories.push(existing)

    await platform.createAirQualitySensor({ provider: 'aqicn', city: 'station/@92323', configDeviceName: 'Kelowna' })

    expect(existing.updateDisplayName).toHaveBeenCalledWith('Kelowna')
    expect(existing.displayName).toBe('Kelowna')
  })

  it('gives the station name back when the config name is cleared', async () => {
    const { platform } = makePlatform()
    const existing = restoredAccessory('Kelowna', { providerName: 'Kelowna KLO Road British Comlumbia' })
    platform.accessories.push(existing)

    await platform.createAirQualitySensor({ provider: 'aqicn', city: 'station/@92323' })

    expect(existing.displayName).toBe('Kelowna KLO Road British Comlumbia')
  })

  it('keeps the station name when nothing in the config names it', async () => {
    const { platform } = makePlatform()
    const existing = restoredAccessory('Kirchackerstrasse', { providerName: 'Kirchackerstrasse' })
    platform.accessories.push(existing)

    await platform.createAirQualitySensor({ provider: 'aqicn', city: 'station/@92323' })

    expect(existing.displayName).toBe('Kirchackerstrasse')
  })
})
