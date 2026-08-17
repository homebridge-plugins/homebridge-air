import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

interface JsonSchema {
  type?: string | string[]
  enum?: unknown[]
  oneOf?: JsonSchema[]
  required?: string[] | boolean
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  condition?: { functionBody?: string }
}

const schemaFile = JSON.parse(readFileSync(new URL('../../config.schema.json', import.meta.url), 'utf8')) as {
  schema: JsonSchema
  layout?: { key?: string, title?: string, items?: string[] }[]
}

function jsonType(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  return typeof value
}

function allowsType(schema: JsonSchema, actual: string): boolean {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  return types.includes(actual)
}

function validate(schema: JsonSchema | undefined, data: unknown, path = '$'): string[] {
  const errors: string[] = []
  if (!schema) {
    return errors
  }

  if (schema.type && data !== undefined) {
    const actual = jsonType(data)
    if (!allowsType(schema, actual)) {
      errors.push(`${path}: expected ${JSON.stringify(schema.type)}, got ${actual}`)
    }
  }

  if (schema.enum && data !== undefined && !schema.enum.includes(data)) {
    errors.push(`${path}: ${JSON.stringify(data)} is not an allowed value`)
  }

  if (schema.oneOf && data !== undefined) {
    const matches = schema.oneOf.filter(sub => validate(sub, data, path).length === 0)
    if (matches.length !== 1) {
      errors.push(`${path}: oneOf matched ${matches.length} alternatives`)
    }
  }

  if (Array.isArray(schema.required) && data && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of schema.required) {
      if (!Object.hasOwn(data, key)) {
        errors.push(`${path}: missing required "${key}"`)
      }
    }
  }

  if (schema.properties && data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>
    for (const [key, sub] of Object.entries(schema.properties)) {
      errors.push(...validate(sub, record[key], `${path}.${key}`))
    }
  }

  if (schema.items && Array.isArray(data)) {
    data.forEach((item, index) => {
      errors.push(...validate(schema.items, item, `${path}[${index}]`))
    })
  }

  return errors
}

function scanLegacyRequired(schema: JsonSchema, path = 'schema'): string[] {
  const hits: string[] = []
  if (schema.required === true || schema.required === false) {
    hits.push(`${path}: required=${schema.required}`)
  }
  if (schema.properties) {
    for (const [key, sub] of Object.entries(schema.properties)) {
      hits.push(...scanLegacyRequired(sub, `${path}.properties.${key}`))
    }
  }
  if (schema.items) {
    hits.push(...scanLegacyRequired(schema.items, `${path}.items`))
  }
  return hits
}

/**
 * Run a property's `condition` the way the Homebridge UI does, so the tests
 * exercise the real expression rather than a paraphrase of it.
 */
function isVisible(property: JsonSchema, device: Record<string, unknown>): boolean {
  const body = property.condition?.functionBody
  if (!body) {
    return true
  }
  // eslint-disable-next-line no-new-func
  return Boolean(new Function('model', 'arrayIndices', body)({ devices: [device] }, 0))
}

describe('config.schema.json', () => {
  const deviceProperties = schemaFile.schema.properties!.devices.items!.properties!

  it('does not use legacy per-property required booleans', () => {
    expect(scanLegacyRequired(schemaFile.schema)).toEqual([])
  })

  it('accepts latitude and longitude as numbers or numeric strings', () => {
    for (const key of ['latitude', 'longitude']) {
      expect(allowsType(deviceProperties[key], 'number')).toBe(true)
      expect(allowsType(deviceProperties[key], 'string')).toBe(true)
    }
  })

  it('does not render the API key as an email field', () => {
    const apiKey = deviceProperties.apiKey as JsonSchema & { 'x-schema-form'?: { type?: string } }
    expect(apiKey['x-schema-form']?.type).not.toBe('email')
  })

  it('validates a zip/city config that omits optional logging', () => {
    expect(validate(schemaFile.schema, {
      name: 'Air',
      platform: 'Air',
      devices: [{
        provider: 'airnow',
        apiKey: '12345678-1234-1234-1234-123456789abc',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: '85001',
      }],
    })).toEqual([])
  })

  it('validates coordinates stored as numbers', () => {
    expect(validate(schemaFile.schema, {
      name: 'Air',
      devices: [{
        provider: 'airnow',
        apiKey: '12345678-1234-1234-1234-123456789abc',
        latitude: 33.4484,
        longitude: -112.074,
      }],
    })).toEqual([])
  })

  it('validates coordinates stored as strings from older UI saves', () => {
    expect(validate(schemaFile.schema, {
      name: 'Air',
      devices: [{
        provider: 'airnow',
        apiKey: '12345678-1234-1234-1234-123456789abc',
        latitude: '47.376887',
        longitude: '8.541694',
      }],
    })).toEqual([])
  })

  it('keeps the per-device settings visible for a station on the prime meridian', () => {
    const device = { provider: 'airnow', apiKey: 'key', latitude: 51.4779, longitude: 0 }
    for (const field of ['firmware', 'refreshRate', 'logging', 'hide_device']) {
      expect(isVisible(deviceProperties[field], device)).toBe(true)
    }
  })

  it('hides state and zip code for a station on the prime meridian', () => {
    const device = { provider: 'airnow', apiKey: 'key', latitude: 51.4779, longitude: 0 }
    expect(isVisible(deviceProperties.state, device)).toBe(false)
    expect(isVisible(deviceProperties.zipCode, device)).toBe(false)
  })

  it('still asks for state and zip code when a device has no coordinates', () => {
    const device = { provider: 'airnow', apiKey: 'key', city: 'Phoenix' }
    expect(isVisible(deviceProperties.state, device)).toBe(true)
    expect(isVisible(deviceProperties.zipCode, device)).toBe(true)
  })

  it('offers the device name as soon as a provider is chosen', () => {
    expect(isVisible(deviceProperties.configDeviceName, { provider: 'aqicn' })).toBe(true)
  })

  it('leaves the device name field empty rather than suggesting a place', () => {
    // A greyed out place name reads as the name this location already has,
    // which is misleading on every location that is not that place
    expect(deviceProperties.configDeviceName).not.toHaveProperty('placeholder')
  })

  it('shows the device name on the location tab and in its title', () => {
    const devicesTab = schemaFile.layout?.find(entry => entry.key === 'devices')
    expect(devicesTab?.items).toContain('devices[].configDeviceName')
    expect(devicesTab?.title).toContain('configDeviceName')
  })

  it('validates a device that names itself', () => {
    expect(validate(schemaFile.schema, {
      name: 'Air',
      devices: [{
        provider: 'aqicn',
        apiKey: '1234567890abcdef',
        configDeviceName: 'Kelowna',
        city: 'Kelowna',
      }],
    })).toEqual([])
  })

  it('rejects a device that is missing the required API key', () => {
    expect(validate(schemaFile.schema, {
      name: 'Air',
      devices: [{
        provider: 'airnow',
      }],
    })).toContain('$.devices[0]: missing required "apiKey"')
  })
})
