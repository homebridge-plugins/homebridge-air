<p align="center">
   <a href="https://github.com/homebridge-plugins/homebridge-air"><img alt="homebridge-air" src="https://raw.githubusercontent.com/homebridge-plugins/homebridge-air/latest/branding/Homebridge_x_Air.png" width="600px"></a>
</p>
<span align="center">

## homebridge-air

Homebridge plugin to integrate air quality data into HomeKit

[![npm](https://img.shields.io/npm/v/@homebridge-plugins/homebridge-air/latest?label=latest)](https://www.npmjs.com/package/@homebridge-plugins/homebridge-air)
[![npm](https://img.shields.io/npm/v/@homebridge-plugins/homebridge-air/beta?label=beta)](https://github.com/homebridge/homebridge/wiki/How-to-Install-Alternate-Plugin-Versions)<br>
[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=flat)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)<br>
[![npm](https://img.shields.io/npm/dt/@homebridge-plugins/homebridge-air)](https://www.npmjs.com/package/@homebridge-plugins/homebridge-air)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=hb-discord)](https://discord.gg/bHjKNkN)

</span>

### Plugin Information

- This plugin allows you to view live air quality data for your location within HomeKit. The plugin:
  - creates a HomeKit air quality sensor for each city you configure
  - retrieves its data from [AirNow](https://www.airnow.gov) (USA) or [Aqicn](https://aqicn.org) (international)
  - requires a free API key from the provider you choose

### Prerequisites

- To use this plugin, you will need to already have:
  - [Node](https://nodejs.org): latest version of `v22`, `v24` or `v26` - any other major version is not supported.
  - [Homebridge](https://homebridge.io): `v2` - refer to link for more information and installation instructions.

### Setup

- [Installation](https://github.com/homebridge-plugins/homebridge-air/wiki/Installation)
- [Configuration](https://github.com/homebridge-plugins/homebridge-air/wiki/Configuration)
- [Beta Version](https://github.com/homebridge-plugins/homebridge-air/wiki/Beta-Version)
- [Node Version](https://github.com/homebridge-plugins/homebridge-air/wiki/Node-Version)

### Features

- Measurements retrieved are PM2.5, PM10 and O3 for AirNow. AQICN adds NO2, SO2 and CO.
  - The Home app shows the overall air quality; the Eve app shows more of the individual measurements.
- **Matter** support is available when running Homebridge v2.0+ with Matter enabled:
  - `options.enableMatter: true` explicitly requests Matter. If Matter is unavailable or disabled, the plugin logs a warning and falls back to HAP.
  - `options.preferMatter: true` uses Matter when available and enabled, but silently falls back to HAP otherwise.
  - Switching between HAP and Matter removes stale cached accessories from the previous mode.

### Help/About

- [Common Errors](https://github.com/homebridge-plugins/homebridge-air/wiki/Common-Errors)
- [Support Request](https://github.com/homebridge-plugins/homebridge-air/issues/new/choose)
- [Changelog](https://github.com/homebridge-plugins/homebridge-air/blob/latest/CHANGELOG.md)

### Credits

- To [@donavanbecker](https://github.com/donavanbecker): the original creator and maintainer of this plugin.
- To [@ToddGreenfield](https://github.com/ToddGreenfield): the author of the original accessory-based plugin [homebridge-airnow](https://github.com/ToddGreenfield/homebridge-airnow).
- To the creators/contributors of [Homebridge](https://homebridge.io) who make this plugin possible.

### Disclaimer

- I am in no way affiliated with AirNow, AQICN or the World Air Quality Index Project, and this plugin is a personal project that I maintain in my free time.
- Use this plugin entirely at your own risk - please see licence for more information.
