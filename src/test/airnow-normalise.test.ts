import { describe, expect, it } from 'vitest'

import { normaliseAirNowRecords, resolveProviderStationName } from '../settings.js'

/**
 * #84: AirNow's newer `current/ziplatlong` endpoint answers with a different shape
 * to `zipCode/current` — camelCase throughout, `nowcastAQI` instead of `AQI`, and
 * ozone spelled `OZONE` rather than `O3`. Swapping the URL alone would leave every
 * field the accessory reads undefined.
 *
 * The sample below is a real response for 93546 (Mammoth Lakes), where the newer
 * endpoint finds a reading per pollutant across three different monitoring sites
 * and the older one returns nothing at all.
 */
const ZIPLATLONG_SAMPLE = [
  {
    dateObserved: '2026-08-08',
    hourObserved: '10:00',
    localTimeZone: 'PDT',
    reportingAreaName: 'Mammoth Lakes',
    siteID: '840MMGBU3000',
    siteName: 'PM2.5 Mammoth Lakes EBAM',
    parameterName: 'PM2.5',
    nowcastAQI: 39,
    aqiCategoryName: 'Good',
  },
  {
    dateObserved: '2026-08-08',
    hourObserved: '10:00',
    localTimeZone: 'PDT',
    reportingAreaName: 'Mammoth Lakes',
    parameterName: 'OZONE',
    nowcastAQI: 28,
    aqiCategoryName: 'Good',
  },
  {
    dateObserved: '2026-08-08',
    hourObserved: '10:00',
    localTimeZone: 'PDT',
    reportingAreaName: 'Mammoth Lakes',
    parameterName: 'PM10',
    nowcastAQI: 15,
    aqiCategoryName: 'Good',
  },
]

const LEGACY_SAMPLE = [
  {
    DateObserved: '2026-08-08',
    HourObserved: 10,
    LocalTimeZone: 'PDT',
    ReportingArea: 'Los Angeles',
    StateCode: 'CA',
    Latitude: 34.05,
    Longitude: -118.24,
    ParameterName: 'O3',
    AQI: 42,
    Category: { Number: 1, Name: 'Good' },
  },
]

describe('normaliseAirNowRecords', () => {
  it('maps the newer endpoint onto the fields the accessory reads', () => {
    const records = normaliseAirNowRecords(ZIPLATLONG_SAMPLE)!

    expect(records).toHaveLength(3)
    expect(records.map(r => r.ParameterName)).toEqual(['PM2.5', 'O3', 'PM10'])
    expect(records.map(r => r.AQI)).toEqual([39, 28, 15])
    expect(records[0].ReportingArea).toBe('Mammoth Lakes')
  })

  // the accessory looks for 'O3'; the newer endpoint calls it 'OZONE', so without
  // this alias ozone would silently never match and no reading would ever appear
  it('renames OZONE to O3 so the ozone lookup still matches', () => {
    const ozone = normaliseAirNowRecords(ZIPLATLONG_SAMPLE)!.find(r => r.ParameterName === 'O3')

    expect(ozone).toBeDefined()
    expect(ozone!.AQI).toBe(28)
  })

  it('turns the "10:00" hour string back into a number', () => {
    expect(normaliseAirNowRecords(ZIPLATLONG_SAMPLE)![0].HourObserved).toBe(10)
  })

  // AirNow appears to be mid-migration and a location can be served by either
  // endpoint, so the older shape has to keep working untouched
  it('passes a response already in the older shape straight through', () => {
    const records = normaliseAirNowRecords(LEGACY_SAMPLE)!

    expect(records[0]).toBe(LEGACY_SAMPLE[0])
    expect(records[0].ParameterName).toBe('O3')
    expect(records[0].AQI).toBe(42)
  })

  it.each([
    ['an object', {}],
    ['a string', 'nope'],
    ['null', null],
    ['undefined', undefined],
  ])('returns undefined for %s rather than throwing', (_label, response) => {
    expect(normaliseAirNowRecords(response)).toBeUndefined()
  })

  it('keeps the station name working for the newer shape', () => {
    const records = normaliseAirNowRecords(ZIPLATLONG_SAMPLE)

    expect(resolveProviderStationName('airnow', records)).toBe('Mammoth Lakes')
  })
})
