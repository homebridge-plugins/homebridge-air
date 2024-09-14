
<span align="center">

<a href="https://github.com/homebridge/verified/blob/master/verified-plugins.json"><img alt="homebridge-verified" src="https://raw.githubusercontent.com/donavanbecker/homebridge-air/latest/branding/Homebridge_x_Air.svg?sanitize=true" width="350px"></a>

# Homebridge Air

<a href="https://www.npmjs.com/package/homebridge-air"><img title="npm version" src="https://badgen.net/npm/v/homebridge-air?icon=npm&label" ></a>
<a href="https://www.npmjs.com/package/homebridge-air"><img title="npm downloads" src="https://badgen.net/npm/dt/homebridge-air?label=downloads" ></a>
<a href="https://discord.gg/8fpZA4S"><img title="discord-air" src="https://badgen.net/discord/online-members/8fpZA4S?icon=discord&label=discord" ></a>
<a href="https://paypal.me/donavanbecker"><img title="donate" src="https://badgen.net/badge/donate/paypal/yellow" ></a>

<p>The Homebridge <a href="https://airnow.gov">Air</a> 
plugin allows you monitor the current AirQuality for your Zip Code from HomeKit and Siri.
</p>

</span>

## Installation

1. Search for "Air" on the plugin screen of [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x).
2. Click **Install**.

## Configuration

1. Login / create an account at https://airnow.gov/

<p align="center">

<img src="https://user-images.githubusercontent.com/9875439/133934622-05a9c19e-c5ba-46ee-b0db-0748420813d7.png" width="450px">

</p>

2. Type in your AirNow.gov API Key and Zip Code
3. Click Save
4. Restart Homebridge

## Supported Air Quality Features

This plugin will create an AirQualitySensor element. The Home app works well, but the Eve app seems to show more measurements. Measurements retrieved are PM2.5, PM10, & O3 for AirNow. Aqicn adds NO2, SO2, CO...  
