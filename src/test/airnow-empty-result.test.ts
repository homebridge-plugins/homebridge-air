import { describe, expect, it } from 'vitest'

import { airNowEmptyResultMessages } from '../utils.js'

/**
 * Regression (#84): AirNow answering with an empty array means it found no reporting
 * station, not that the endpoint is broken - but the plugin only said "Invalid
 * response structure or empty data". A reporter in a remote area read that as the API
 * having been retired, when the real answer was that their location genuinely had no
 * station in range on the endpoint being used at the time.
 */
describe('airNowEmptyResultMessages', () => {
  it('explains an empty array as no station found, not a bad response', () => {
    const messages = airNowEmptyResultMessages([])

    expect(messages[0]).toContain('no air quality data returned')
    // the old wording blamed the response shape, which is what misled the reporter
    expect(messages.join(' ')).not.toContain('Invalid response structure')
  })

  // the current endpoint ignores `distance` and always looks 50 miles, so the
  // message must not send anyone off to change a setting that does nothing
  it('names AirNow\'s own fixed lookup rather than the distance setting', () => {
    const messages = airNowEmptyResultMessages([])

    expect(messages.join(' ')).toContain('50 miles')
    expect(messages.join(' ')).not.toContain('distance parameter')
  })

  it.each([
    ['an object', {}],
    ['a string', 'not json'],
    ['null', null],
    ['undefined', undefined],
  ])('still reports a genuinely malformed response (%s) as such', (_label, response) => {
    const messages = airNowEmptyResultMessages(response)

    expect(messages).toEqual(['AirNow API Error - Invalid response structure or empty data'])
  })
})
