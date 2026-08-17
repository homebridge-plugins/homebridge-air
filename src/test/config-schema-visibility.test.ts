import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const schemaFile = JSON.parse(readFileSync(new URL('../../config.schema.json', import.meta.url), 'utf8')) as {
  schema: {
    properties: {
      devices: {
        items: {
          properties: Record<string, { condition?: { functionBody?: string } }>
        }
      }
    }
  }
}

describe('per-device settings visibility', () => {
  const deviceProperties = schemaFile.schema.properties.devices.items.properties
  const fields = ['firmware', 'refreshRate', 'logging', 'hide_device'] as const

  it('shows firmware, refresh rate, logging and hide_device for city or coordinates, not only zip+city', () => {
    for (const field of fields) {
      const body = deviceProperties[field].condition?.functionBody
      expect(body).toBeTruthy()
      expect(body).toContain('city')
      expect(body).toContain('latitude')
      expect(body).toContain('longitude')
      expect(body).not.toContain('zipCode')
    }
  })
})
