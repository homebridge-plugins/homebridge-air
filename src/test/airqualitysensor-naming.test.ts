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
    updateDisplayName: vi.fn((name: string) => {
      accessory.displayName = name
    }),
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
    expect(sensor.platform.validateAndCleanDisplayName).not.toHaveBeenCalled()
    expect(sensor.api.updatePlatformAccessories).not.toHaveBeenCalled()
  })

  it('stays ready to adopt a station name while the config names the device', async () => {
    const sensor = sensorStub({ provider: 'aqicn', city: 'station/@92323', configDeviceName: 'Kelowna' }, 'Kelowna')

    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)

    // Disarming here would strand the accessory on the city - 'Station 92323' -
    // for good once the name is cleared again
    expect(sensor.accessory.context.nameFromProvider).toBe(true)
  })

  it('adopts the station name once the config stops naming the device', async () => {
    const device: Record<string, unknown> = { provider: 'aqicn', city: 'station/@92323', configDeviceName: 'Kelowna' }
    const sensor = sensorStub(device, 'Kelowna')

    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)
    expect(sensor.accessory.displayName).toBe('Kelowna')

    // The user empties the Device Name field and Homebridge restarts
    delete device.configDeviceName
    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)

    expect(sensor.accessory.displayName).toBe('Kelowna KLO Road British Comlumbia')
    expect(sensor.accessory.context.providerName).toBe('Kelowna KLO Road British Comlumbia')
  })

  it('still adopts the station name when the config does not name the device (#69)', async () => {
    const sensor = sensorStub({ provider: 'aqicn', city: 'station/@92323' }, 'Station 92323')

    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)

    expect(sensor.accessory.displayName).toBe('Kelowna KLO Road British Comlumbia')
    expect(sensor.accessory.context.providerName).toBe('Kelowna KLO Road British Comlumbia')
    expect(sensor.api.updatePlatformAccessories).toHaveBeenCalled()
  })

  it('keeps the HAP accessory\'s own copy of the name in step', async () => {
    const sensor = sensorStub({ provider: 'aqicn', city: 'station/@92323' }, 'Station 92323')

    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)

    expect(sensor.accessory.updateDisplayName).toHaveBeenCalledWith('Kelowna KLO Road British Comlumbia')
  })

  it('ignores a name that is only whitespace', async () => {
    const sensor = sensorStub({ provider: 'aqicn', city: 'station/@92323', configDeviceName: '  ' }, 'Station 92323')

    await AirQualitySensor.prototype.applyProviderStationName.call(sensor as any)

    expect(sensor.accessory.displayName).toBe('Kelowna KLO Road British Comlumbia')
  })
})
