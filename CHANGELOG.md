All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/)

## [1.0.6](https://github.com/homebridge-plugins/homebridge-air/releases/tag/v1.0.6) - (2025-09-05)

### What's Changed
- Fix AQICN station ID validation error for documented syntax (#47)
- Enhanced validation logic to handle AQICN station formats specially without warnings
- Added `generateAqicnDisplayName()` helper to convert AQICN URLs to readable HomeKit display names
- Preserves API functionality while cleaning HomeKit display names for station IDs like `/station/@92323`

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.5...v1.0.6

## [1.0.5](https://github.com/homebridge-plugins/homebridge-air/releases/tag/v1.0.5) - (2025-09-03)

### What's Changed
- Fix HAP-NodeJS warning by validating accessory names before constructor call (#31) (d9888e2)
- Fix AQICN API response structure handling and improve error messages (0e3962c)
- Initial plan (dd020b7)

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.4...v1.0.5

## [1.0.4](https://github.com/homebridge-plugins/homebridge-air/releases/tag/v1.0.4) (2025-09-03)

### What's Changed
- Fix AQICN status parsing bug by handling different data structures correctly [#24](https://github.com/homebridge-plugins/homebridge-air/pull/24)
- Modified parseStatus() method to conditionally handle AirNow (array) vs AQICN (object) data structures
- Added test case for AQICN device status handling
- Resolves AQICN provider failing to parse air quality data [#22](https://github.com/homebridge-plugins/homebridge-air/issues/22)

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.3...v1.0.4

## [1.0.3](https://github.com/homebridge-plugins/homebridge-air/releases/tag/v1.0.3) (2025-04-10)

### What's Changed
- Fix AQICN status update bug by completing interface and adding error handling [#17](https://github.com/homebridge-plugins/homebridge-air/pull/17)
- Fix can't fetch data from AQICN [#11](https://github.com/homebridge-plugins/homebridge-air/pull/11)
- Update config.schema.json [#19](https://github.com/homebridge-plugins/homebridge-air/pull/19)
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.2...v1.0.3

# *No New Releases During Lent*

### What's Changes
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.1...v1.0.2

## [1.0.1](https://github.com/homebridge-plugins/homebridge-air/releases/tag/v1.0.1) (2025-01-25)

### What's Changes
- Housekeeping and updated dependencies.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v1.0.0...v1.0.1

## [1.0.0](https://github.com/homebridge-plugins/homebridge-air/releases/tag/v1.0.0) (2024-11-10)

### What's Changes
- Release of [homebridge-air](https://github.com/homebridge-plugins/homebridge-air) which allows you to update your see the air qualiry from AirNow Web API.

**Full Changelog**: https://github.com/homebridge-plugins/homebridge-air/compare/v0.1.0...v1.0.0

## [0.1.0](https://github.com/homebridge-plugins/homebridge-air/releases/tag/v0.1.0) (2024-09-07)

### What's Changes
- Initial Release
