import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const page = readFileSync(new URL('../homebridge-ui/public/index.html', import.meta.url), 'utf8')

describe('location tab', () => {
  it('asks for an optional device name', () => {
    expect(page).toContain('id="deviceNameField"')
    expect(page).toMatch(/<label for="deviceNameField">Device Name:<\/label>/)
  })

  it('starts the name box empty rather than suggesting a place', () => {
    // A greyed out place name reads as a value the location already has
    expect(page).toMatch(/<input[^>]*id="deviceNameField"(?![^>]*placeholder)[^>]*>/)
  })

  it('saves the name it was given', () => {
    expect(page).toMatch(/device\.configDeviceName\s*=\s*configDeviceName/)
  })

  it('leaves the name out of the config when it was not filled in', () => {
    // An empty string would count as a name and stop the accessory ever being
    // named after its station
    expect(page).toMatch(/configDeviceName\s*=\s*document\.getElementById\((['"])deviceNameField\1\)\.value\.trim\(\)/)
    expect(page).toMatch(/if\s*\(\s*configDeviceName\s*\)/)
  })

  it('clears the name after saving, so the next location does not inherit it', () => {
    expect(page).toMatch(/getElementById\((['"])deviceNameField\1\)\.value\s*=\s*(['"])\2/)
  })
})
