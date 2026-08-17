import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const page = readFileSync(new URL('../homebridge-ui/public/index.html', import.meta.url), 'utf8')

describe('location tab', () => {
  it('asks for an optional device name', () => {
    expect(page).toContain('id="deviceNameField"')
    expect(page).toMatch(/<label for="deviceNameField">Device Name:<\/label>/)
  })

  it('saves the name it was given', () => {
    expect(page).toContain('device.configDeviceName = configDeviceName')
  })

  it('leaves the name out of the config when it was not filled in', () => {
    // An empty string would count as a name and stop the accessory ever being
    // named after its station
    expect(page).toContain('if (configDeviceName) {')
    expect(page).toContain('.value.trim()')
  })

  it('clears the name after saving, so the next location does not inherit it', () => {
    expect(page).toContain('document.getElementById(\'deviceNameField\').value = \'\'')
  })
})
