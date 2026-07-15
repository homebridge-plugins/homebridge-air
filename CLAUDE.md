# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — `rimraf ./dist && tsc && npm run plugin-ui`. The `plugin-ui` step rsyncs `src/homebridge-ui/public/index.html` into `dist/` (the UI server itself is TypeScript and compiled by `tsc`). Skipping it produces a broken published package.
- `npm run lint` — ESLint over the whole repo with `--max-warnings=0`. CI fails on any warning. `npm run lint:fix` to autofix.
- `npm test` — vitest, test files live in `src/test/`. `npm run test:watch` and `npm run test-coverage` also available.
- `npm run watch` — build, `npm link`, then `nodemon`: recompiles and restarts `homebridge -U ./test/hbConfig -D` on `src/**/*.ts` changes. `./test/hbConfig` is gitignored; create it locally with a `config.json` containing an AirNow or Aqicn API key.
- `npm run docs` — typedoc into `docs/` (gitignored — generated output is never committed).
- `npm run prepublishOnly` — lint then build; runs automatically on publish.

CI (`.github/workflows/build.yml`) runs install + lint on Node 22.x/24.x. Releases publish via `.github/workflows/release.yml`: a GitHub release (tag `vX.Y.Z`) publishes to npm's `latest` tag; pushes to `beta-X.Y.Z` / `alpha-X.Y.Z` branches publish incrementing prerelease versions to the `beta` / `alpha` tags.

Supported Node: `^22.12.0 || ^24.0.0`. Homebridge: `^2.0.0`.

## Architecture

Homebridge dynamic platform plugin (`platform: "Air"`, package `@homebridge-plugins/homebridge-air`) creating a HomeKit air quality sensor per configured city, fed by the AirNow or Aqicn public APIs.

### HAP/Matter platform selection (`src/utils.ts > createPlatformProxy`)

`src/index.ts` registers a proxy constructor that picks the platform class at runtime: `AirMatterPlatform` (`src/AirMatterPlatform.ts`, extends `AirPlatform`) when `options.enableMatter` or `options.preferMatter` is set and Homebridge reports Matter available+enabled, otherwise the HAP `AirPlatform` (`src/platform.ts`). `enableMatter` logs a warning on fallback; `preferMatter` falls back silently. Matter API calls (`api.matter?.…`) must stay optional-chained — Matter may be absent at runtime. Each platform removes stale cached accessories from the other mode on startup.

### Providers (`src/settings.ts`, `src/devices/airqualitysensor.ts`)

Two data providers, selected per device via `device.provider`: `airnow` (US only, needs zip code) and `aqicn` (international, uses city or lat/long — `resolveAqicnLocationSegment` builds the URL segment, preferring geo coordinates). Requests go through undici with the shared timeout/rate-limit settings in `src/settings.ts` (`REQUEST_TIMEOUT_CONFIG`, `REQUEST_RATE_LIMIT_CONFIG`). `HomeKitAQI` maps provider AQI numbers to the 0–5 HomeKit air quality scale.

### Device classes (`src/devices/`)

`deviceBase` (`src/devices/device.ts`) wires per-device config (logging level, refresh/update/push rates) and the AccessoryInformation service. `AirQualitySensor` extends it for HAP and polls the provider on `deviceRefreshRate` (default 3600s). Instances are stored on the accessory as `accessory.control` (module augmentation in `device.ts`). The Matter equivalent `AirQualitySensorMatter` is not accessory-based; the Matter platform keeps instances in its `matterSensors` map and pushes AQI updates into the Matter cluster state.

### Logging

The platform and `deviceBase` expose leveled log helpers (`infoLog`, `warnLog`, `errorLog`, `debugLog`, …) gated by `config.options.logging` with per-device `logging` overrides. Use these instead of `this.log` directly so user log settings are respected.

## Conventions

- TypeScript ESM (`"type": "module"`): relative imports use `.js` extensions even from `.ts` source.
- ESLint is `@antfu/eslint-config` (flat config in `eslint.config.js`): single quotes, 1tbs braces, `curly` multi-line only, sorted exports. Run `npm run lint:fix` before committing.
- `config.schema.json` defines the Homebridge UI form and must stay in sync with the interfaces in `src/settings.ts` (`AirPlatformConfig`, `devicesConfig`, `options`).
- Copyright headers in `src/` credit @donavanbecker, the original plugin author — leave them in place.
