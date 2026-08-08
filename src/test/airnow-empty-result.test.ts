import { describe, expect, it } from 'vitest'

import { airNowEmptyResultMessages } from '../utils.js'

/**
 * Regression (#84): AirNow answering with an empty array means "no reporting station
 * within `distance` miles", not a broken endpoint - but the plugin only said
 * "Invalid response structure or empty data". A reporter in a remote area read that
 * as the API having been retired and opened a PR swapping the live endpoints for one
 * that does not exist, when the fix was to widen the search radius.
 */
describe('airNowEmptyResultMessages', () => {
  it('explains an empty array as no station in range, and names the radius', () => {
    const messages = airNowEmptyResultMessages([], '25')

    expect(messages[0]).toContain('within 25 miles')
    expect(messages.join(' ')).toContain('increasing the distance parameter')
    // the old wording blamed the response shape, which is what misled the reporter
    expect(messages.join(' ')).not.toContain('Invalid response structure')
  })

  it('uses the configured distance rather than assuming the default', () => {
    expect(airNowEmptyResultMessages([], '150')[0]).toContain('within 150 miles')
  })

  it.each([
    ['an object', {}],
    ['a string', 'not json'],
    ['null', null],
    ['undefined', undefined],
  ])('still reports a genuinely malformed response (%s) as such', (_label, response) => {
    const messages = airNowEmptyResultMessages(response, '25')

    expect(messages).toEqual(['AirNow API Error - Invalid response structure or empty data'])
  })
})
