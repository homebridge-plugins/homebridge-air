# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/)

## v2.1.0 (Pending Release)

### Changed

- feat: name new accessories after the station their data describes (#69) (@jsiegenthaler)
- fix: strip the station prefix from aqicn station name paths (#72) (@jsiegenthaler)
- docs: spell airnow consistently (#71) (@jsiegenthaler)
- docs: mention both air quality providers in the plugin description (#74) (@jsiegenthaler)
- docs: spell aqicn consistently as uppercase across the project (#74) (@jsiegenthaler)

## v2.0.3 (2026-07-15)

### Changed

- fix: stop the config ui failing validation over the optional logging settings (#70) (@jsiegenthaler)

## v2.0.2 (2026-07-15)

### Changed

- fix: give aqicn accessories a unique serial number instead of a shared placeholder (#49) (@jsiegenthaler)
- fix: report the air quality provider as the manufacturer instead of always airnow (#68) (@jsiegenthaler)

## v2.0.1 (2026-07-15)

### Changed

- chore(deps): update dependencies
- chore: add .idea to .gitignore
- fix: guard Matter API calls for optional api.matter
- chore(github): align workflows, funding and issue templates with the other org plugins
- chore: align npm publishing files with the other org plugins
- chore: standardise the eslint setup with the other org plugins
- refactor: store device instances on their accessories like the other org plugins
- style: apply the standardised lint rules
- chore: standardise the package scripts and publishing config
- chore: update the plugin metadata for the new maintainer
- docs: refresh the readme
- docs: add claude and copilot instructions files
- docs: use the standard org readme banner
- fix: keep matter display names within the 32 character limit
- chore(github): update the setup-node action to v7
- fix: convert aqicn station and city website paths into valid feed api paths (#49) (@jsiegenthaler)
- fix: fall back to the highest pollutant reading when aqicn omits the overall aqi (#7) (@rafalkarolczyk)
- fix: report the real aqicn api error message instead of a generic missing data error (#7) (@rafalkarolczyk)
- fix: request aqicn community sensors using their a prefixed feed id (#7) (#49) (@jsiegenthaler)
- fix: remove cached accessories for devices that are no longer configured (#49) (@jsiegenthaler)
- fix: accept a prefixed sensor ids written inside a station path (#7) (@rafalkarolczyk)

## [2.0.0](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.8...v2.0.0) (2026-04-15)

### What's Changed
- Added Homebridge v2.0 Matter support with runtime HAP/Matter platform proxy selection.
- Added Matter platform implementation and Matter sensor poller with AQI state updates.
- Added config options `options.enableMatter` and `options.preferMatter` with distinct fallback behavior.
- Added schema UI support for Matter settings.
- Added tests for platform proxy runtime selection and fallback semantics.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.8...v2.0.0

## [1.0.8](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.7...v1.0.8) (2025-11-03)

### What's Changed
- **Bug Fix**: Fixed AirNow API endpoints to use correct paths (`latLong` and `zipCode`) per official documentation
- **Feature**: Added "Save to Config" button on location lookup tab with duplicate prevention
- **Feature**: Implemented 10-minute caching and rate limiting (60 calls/hour) per AirNow best practices
- **Feature**: Added reverse geocoding fallback using OpenStreetMap Nominatim API
- **Improvement**: Enhanced error handling and debug logging
- Housekeeping and updated dependencies

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.7...v1.0.8

## [1.0.7](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.6...v1.0.7) (2025-09-17)

### What's Changed
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.6...v1.0.7

## [1.0.6](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.5...v1.0.6) (2025-09-15)

### What's Changed
- Enable blank issues in issue template configuration ([56f3f86](https://github.com/homebridge-plugins/homebridge-air/commit/56f3f86))
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.5...v1.0.6

## [1.0.5](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.4...v1.0.5) (2025-09-03)

### What's Changed
- Fix HAP-NodeJS warning by validating accessory names before constructor call [#31](https://github.com/homebridge-plugins/homebridge-air/pull/31)
- Fix AQICN API response structure handling and improve error messages
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.4...v1.0.5

## [1.0.4](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.3...v1.0.4) (2025-09-03)

### What's Changed
- Fix AQICN status parsing bug by handling different data structures correctly [#24](https://github.com/homebridge-plugins/homebridge-air/pull/24)
- Modified parseStatus() method to conditionally handle AirNow (array) vs AQICN (object) data structures
- Added test case for AQICN device status handling
- Resolves AQICN provider failing to parse air quality data [#22](https://github.com/homebridge-plugins/homebridge-air/issues/22)

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.3...v1.0.4

## [1.0.3](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.2...v1.0.3) (2025-04-10)

### What's Changed
- Fix AQICN status update bug by completing interface and adding error handling [#17](https://github.com/homebridge-plugins/homebridge-air/pull/17)
- Fix can't fetch data from AQICN [#11](https://github.com/homebridge-plugins/homebridge-air/pull/11)
- Update config.schema.json [#19](https://github.com/homebridge-plugins/homebridge-air/pull/19)
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.2...v1.0.3

## [1.0.2](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.1...v1.0.2) (2025-03-05)

### What's Changed
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.1...v1.0.2

## [1.0.1](https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.0...v1.0.1) (2025-01-25)

### What's Changed
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.0...v1.0.1

## [1.0.0](https://github.com/homebridge-plugins/homebridge-air/compare/v0.1.0...v1.0.0) (2024-11-10)

### What's Changed
- Release of [homebridge-air](https://github.com/homebridge-plugins/homebridge-air) which allows you to see the air quality from AirNow Web API.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v0.1.0...v1.0.0

## [0.1.0](https://github.com/homebridge-plugins/homebridge-air/releases/tag/v0.1.0) (2024-09-07)

### What's Changed
- Initial Release
