# Copilot instructions

Guidance for AI coding agents working in this repository. The fuller version of this document is [CLAUDE.md](../CLAUDE.md) at the repo root — keep the two in sync.

## Commands

- Build: `npm run build` (`rimraf ./dist` → `tsc` → copy plugin UI html). All steps are required for a working package.
- Lint: `npm run lint` (`eslint . --max-warnings=0`, CI fails on warnings); `npm run lint:fix` to autofix.
- Test: `npm test` (vitest, test files in `src/test/`).
- Local dev loop: `npm run watch` (rebuild + restart `homebridge -U ./test/hbConfig -D` on changes; `./test/hbConfig` is gitignored, create locally).

## Key architecture facts

- Homebridge dynamic platform plugin creating a HomeKit air quality sensor per configured city, fed by the AirNow (US) or Aqicn (international) public APIs.
- `src/index.ts` registers a runtime HAP/Matter proxy (`createPlatformProxy` in `src/utils.ts`): `options.enableMatter` warns and falls back to HAP when Matter is unavailable; `options.preferMatter` falls back silently. Keep `api.matter?.…` calls optional-chained.
- Provider requests go through undici with the shared timeout/rate-limit settings in `src/settings.ts`; `HomeKitAQI` maps provider AQI values to the HomeKit 0–5 scale.
- `AirQualitySensor` (HAP) extends `deviceBase` (`src/devices/device.ts`) and is stored as `accessory.control`; the Matter platform keeps `AirQualitySensorMatter` pollers in its `matterSensors` map.
- Use the platform's leveled log helpers (`infoLog`, `debugLog`, …) so user logging settings are respected.

## Conventions

- TypeScript ESM: relative imports need `.js` extensions.
- ESLint `@antfu/eslint-config`: single quotes, sorted exports; run `npm run lint:fix` before committing.
- `config.schema.json` must stay in sync with the config interfaces in `src/settings.ts`.
- Copyright headers in `src/` credit @donavanbecker (original author) — leave them in place.
