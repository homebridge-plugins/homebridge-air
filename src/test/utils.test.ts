import type { API, DynamicPlatformPlugin, Logging } from 'homebridge'

import type { AirPlatformConfig } from '../settings.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPlatformProxy } from '../utils.js'

// Dummy platform constructors – must use regular functions (not arrow functions) so they can be
// called with `new` inside the PlatformProxy constructor.
// eslint-disable-next-line prefer-arrow-callback
const MockHapPlatform = vi.fn().mockImplementation(function () {})
// eslint-disable-next-line prefer-arrow-callback
const MockMatterPlatform = vi.fn().mockImplementation(function () {})

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  success: vi.fn(),
  prefix: 'test',
} as unknown as Logging

function makeConfig(enableMatter?: boolean, preferMatter?: boolean): AirPlatformConfig {
  return {
    platform: 'Air',
    name: 'Air',
    options: { enableMatter, preferMatter },
  } as AirPlatformConfig
}

function makeApi(matterAvailable: boolean, matterEnabled: boolean): API {
  return {
    isMatterAvailable: vi.fn().mockReturnValue(matterAvailable),
    isMatterEnabled: vi.fn().mockReturnValue(matterEnabled),
  } as unknown as API
}

describe('createPlatformProxy', () => {
  beforeEach(() => {
    MockHapPlatform.mockClear()
    MockMatterPlatform.mockClear()
    vi.clearAllMocks()
  })

  describe('hAP selection (default)', () => {
    it('uses HAP when neither enableMatter nor preferMatter is set', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(true, true)
      void new Proxy(mockLog, makeConfig(), api)
      expect(MockHapPlatform).toHaveBeenCalledOnce()
      expect(MockMatterPlatform).not.toHaveBeenCalled()
    })

    it('uses HAP when config is undefined/null', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(true, true)
      void new Proxy(mockLog, undefined as unknown as AirPlatformConfig, api)
      expect(MockHapPlatform).toHaveBeenCalledOnce()
      expect(MockMatterPlatform).not.toHaveBeenCalled()
    })
  })

  describe('matter selection', () => {
    it('uses Matter when enableMatter=true and Matter is available+enabled', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(true, true)
      void new Proxy(mockLog, makeConfig(true), api)
      expect(MockMatterPlatform).toHaveBeenCalledOnce()
      expect(MockHapPlatform).not.toHaveBeenCalled()
    })

    it('uses Matter when preferMatter=true and Matter is available+enabled', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(true, true)
      void new Proxy(mockLog, makeConfig(false, true), api)
      expect(MockMatterPlatform).toHaveBeenCalledOnce()
      expect(MockHapPlatform).not.toHaveBeenCalled()
    })
  })

  describe('hAP fallback when Matter is unavailable', () => {
    it('falls back to HAP when enableMatter=true but Matter is not available', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(false, false)
      void new Proxy(mockLog, makeConfig(true), api)
      expect(MockHapPlatform).toHaveBeenCalledOnce()
      expect(MockMatterPlatform).not.toHaveBeenCalled()
    })

    it('falls back to HAP when enableMatter=true but Matter is available but not enabled', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(true, false)
      void new Proxy(mockLog, makeConfig(true), api)
      expect(MockHapPlatform).toHaveBeenCalledOnce()
      expect(MockMatterPlatform).not.toHaveBeenCalled()
    })

    it('falls back to HAP when preferMatter=true but Matter is not available', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(false, false)
      void new Proxy(mockLog, makeConfig(false, true), api)
      expect(MockHapPlatform).toHaveBeenCalledOnce()
      expect(MockMatterPlatform).not.toHaveBeenCalled()
    })
  })

  describe('logging semantics: enableMatter vs preferMatter', () => {
    it('logs a warning when enableMatter=true but Matter is not available', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(false, false)
      void new Proxy(mockLog, makeConfig(true), api)
      expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('Matter'))
    })

    it('logs a warning when enableMatter=true but Matter is available but not enabled', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(true, false)
      void new Proxy(mockLog, makeConfig(true), api)
      expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('Matter'))
    })

    it('does NOT log a warning when preferMatter=true and Matter is not available (silent fallback)', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(false, false)
      void new Proxy(mockLog, makeConfig(false, true), api)
      expect(mockLog.warn).not.toHaveBeenCalled()
    })

    it('does NOT log a warning when neither flag is set and Matter is not available', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(false, false)
      void new Proxy(mockLog, makeConfig(), api)
      expect(mockLog.warn).not.toHaveBeenCalled()
    })
  })

  describe('proxy returns correct constructor args', () => {
    it('passes log, config, and api through to the selected platform', () => {
      const Proxy = createPlatformProxy(
        MockHapPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
        MockMatterPlatform as unknown as new (...args: any[]) => DynamicPlatformPlugin,
      )
      const api = makeApi(false, false)
      const config = makeConfig()
      void new Proxy(mockLog, config, api)
      expect(MockHapPlatform).toHaveBeenCalledWith(mockLog, config, api)
    })
  })
})
