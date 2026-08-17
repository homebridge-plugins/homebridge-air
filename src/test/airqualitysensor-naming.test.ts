import { describe, expect, it, vi } from 'vitest'

import { AirQualitySensor } from '../devices/airqualitysensor.js'

/**
 * Build the parts of an AirQualitySensor that `applyProviderStationName` uses.
 * The real constructor polls a provider, so the method is exercised against a
 * stand-in instead.
 */
function sensorStub(device: Record<string, unknown>, displayName: string) {
  const accessory = {
    displayName,
    context: { nameFromProvider: true } as Record<string, unknown>,
    getService: vi.fn().mockReturnValue({ updateCharacteristic: vi.fn().mockReturnThis() }),
  }

  return {
    accessory,
    device,
    deviceStatus: { city: { name: 'Kelowna KLO Road, British Comlumbia, Canada' } },
    platform: { validateAndCleanDisplayName: vi.fn(async (_displayName: string, _name: string, value: string) => value) },
    AirQualitySensor: { Name: displayName, Service: { updateCharacteristic: vi.fn() } },
    hap: {
      Characteristic: { Name: 'Name', ConfiguredName: 'ConfiguredName' },
      Service: { AccessoryInformation: 'AccessoryInformation' },
    },
    api: { updatePlatformAccessories: vi.fn() },
    infoLog: vi.fn(),
  }
}

describe('applyProviderStationName', () => {
  it('leaves an accessory named by the config alone', async () => {
    const sensor = sensorStub({ provider: 'aqicn', city: 'Kelowna', configDeviceName: 'Kelowna' }, 'Kelowna')

    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)

    expect(sensor.accessory.displayName).toBe('Kelowna')
    expect(sensor.accessory.context.nameFromProvider).toBe(false)
    expect(sensor.platform.validateAndCleanDisplayName).not.toHaveBeenCalled()
    expect(sensor.api.updatePlatformAccessories).not.toHaveBeenCalled()
  })

  it('still adopts the station name when the config does not name the device (#69)', async () => {
    const sensor = sensorStub({ provider: 'aqicn', city: 'station/@92323' }, 'Station 92323')

    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)

    expect(sensor.accessory.displayName).toBe('Kelowna KLO Road British Comlumbia')
    expect(sensor.accessory.context.providerName).toBe('Kelowna KLO Road British Comlumbia')
    expect(sensor.api.updatePlatformAccessories).toHaveBeenCalled()
  })

  it('ignores a name that is only whitespace', async () => {
    const sensor = sensorStub({ provider: 'aqicn', city: 'station/@92323', configDeviceName: '  ' }, 'Station 92323')

    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)

    expect(sensor.accessory.displayName).toBe('Kelowna KLO Road British Comlumbia')
  })
})
