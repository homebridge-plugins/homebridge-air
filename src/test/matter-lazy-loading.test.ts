/**
 * Keep the Matter stack out of HAP-only bridges.
 *
 * Homebridge loads `@matter/*` only for bridges that have Matter turned on.
 * The `homebridge` package entry re-exports Matter device types, so a single
 * value import from it loads the whole Matter stack the moment the plugin is
 * loaded. That raised the memory of a HAP-only child bridge from about 50MB to
 * about 200MB. Type imports are erased at compile time and are fine.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))
const HOMEBRIDGE_IMPORT = /^import\s(?!type\s)[^'"]*['"]homebridge['"]/m

function pluginSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'test' ? [] : pluginSourceFiles(path)
    }
    return entry.name.endsWith('.ts') ? [path] : []
  })
}

describe('matter lazy loading', () => {
  it('finds the plugin source files', () => {
    expect(pluginSourceFiles(SRC_DIR)).toContain(join(SRC_DIR, 'AirMatterPlatform.ts'))
  })

  it('tells a value import from a type import', () => {
    expect(HOMEBRIDGE_IMPORT.test('import { devices } from \'homebridge\'')).toBe(true)
    expect(HOMEBRIDGE_IMPORT.test('import {\n  devices,\n} from \'homebridge\'')).toBe(true)
    expect(HOMEBRIDGE_IMPORT.test('import \'homebridge\'')).toBe(true)
    expect(HOMEBRIDGE_IMPORT.test('import type { API } from \'homebridge\'')).toBe(false)
    expect(HOMEBRIDGE_IMPORT.test('import { readFileSync } from \'node:fs\'\nimport type { API } from \'homebridge\'')).toBe(false)
  })

  it('has no runtime import from the homebridge package', () => {
    const offenders = pluginSourceFiles(SRC_DIR).filter(file => HOMEBRIDGE_IMPORT.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
