# Homebridge Air Plugin

Homebridge Air is a TypeScript plugin for Homebridge that allows monitoring air quality data from AirNow and AQICN providers through HomeKit and Siri.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

- **Bootstrap and install dependencies:**
  - `npm install` -- takes 30-45 seconds. NEVER CANCEL. Set timeout to 120+ seconds.

- **Build the plugin:**
  - `npm run build` -- takes 5 seconds. Runs clean, tsc, and plugin-ui tasks.
  - `npm run clean` -- removes the dist folder.

- **Run tests:**
  - `npm test` -- takes 1 second. Runs Vitest test suite with 8 tests.
  - `npm run test:watch` -- runs tests in watch mode.
  - `npm run test-coverage` -- runs tests with coverage report.

- **Lint and format code:**
  - `npm run lint` -- takes 3 seconds. Runs ESLint on all TypeScript files.
  - `npm run lint:fix` -- automatically fixes linting issues.

- **Development workflow:**
  - `npm run watch` -- NEVER CANCEL. Builds, links plugin globally, and starts Homebridge in development mode with auto-reload. Takes 10+ seconds to start. Set timeout to 300+ seconds.
  - The watch command monitors src/**/* and config.schema.json for changes.
  - Homebridge will start on a random port and display a QR code for iOS pairing.

- **Generate documentation:**
  - `npm run docs` -- takes 2 seconds. Generates TypeDoc documentation in ./docs.

## Validation

- **ALWAYS run these commands after making changes:**
  - `npm run lint` -- REQUIRED before committing or CI will fail.
  - `npm run build` -- verify your changes compile correctly.
  - `npm test` -- ensure all tests pass.

- **Manual validation scenarios:**
  - After making platform changes: run `npm run watch` and verify Homebridge starts without errors.
  - After UI changes: check that `npm run plugin-ui` completes and copies files to dist/homebridge-ui/public/.
  - After configuration changes: validate against config.schema.json structure.

- **End-to-end testing:**
  - Use `npm run watch` to start development Homebridge instance.
  - The plugin loads as "@homebridge-plugins/homebridge-air.Air" platform.
  - Test plugin functionality requires valid API keys for AirNow or AQICN services.

## Build and Runtime Requirements

- **Node.js**: Version 20 or 22 (specified in package.json engines).
- **Homebridge**: Version 1.9.0+ or 2.0.0+ (available via npx homebridge).
- **Development tools**: All dependencies install via npm install.

## Key Projects and Structure

### Source Code Structure
```
src/
├── index.ts           # Main plugin entry point - registers platform
├── platform.ts       # AirPlatform class - main plugin logic
├── settings.ts        # Configuration interfaces and utilities
├── devices/
│   ├── device.ts      # Base device class
│   └── airqualitysensor.ts # Air quality sensor implementation
└── homebridge-ui/
    ├── server.ts      # Custom Homebridge UI server
    └── public/        # UI assets
```

### Configuration Files
- `config.schema.json` -- Homebridge UI configuration schema with provider options (AirNow/AQICN)
- `package.json` -- Node.js project configuration with all npm scripts
- `tsconfig.json` -- TypeScript compilation settings
- `eslint.config.js` -- ESLint configuration using @antfu/eslint-config
- `nodemon.json` -- Development server configuration for watch mode

### Build Outputs
- `dist/` -- Compiled JavaScript and type definitions
- `docs/` -- Generated TypeDoc documentation
- `coverage/` -- Test coverage reports

## Common Tasks

### Adding New Features
1. **ALWAYS run linting first:** `npm run lint`
2. **Make your changes** in the appropriate src/ files
3. **Add tests** if the feature needs test coverage
4. **Build and test:** `npm run build && npm test`
5. **Test in development:** `npm run watch` and verify functionality
6. **Final validation:** `npm run lint` before committing

### Debugging Issues
1. **Check build output:** `npm run build` for TypeScript errors
2. **Review test results:** `npm test` for failing tests  
3. **Development testing:** `npm run watch` to run in live Homebridge environment
4. **Check logs:** Homebridge outputs detailed logs during watch mode

### Configuration Changes
- **Schema updates:** Modify config.schema.json for new configuration options
- **Platform config:** Update AirPlatformConfig interface in settings.ts
- **UI updates:** Modify src/homebridge-ui/ files and run `npm run plugin-ui`

## CRITICAL Timing and Timeout Requirements

- **npm install:** NEVER CANCEL - takes 30-45 seconds, set timeout 120+ seconds
- **npm run watch:** NEVER CANCEL - takes 10+ seconds to start, runs indefinitely, set timeout 300+ seconds  
- **npm run build:** Fast - 5 seconds, set timeout 30+ seconds
- **npm run test:** Very fast - 1 second, set timeout 30+ seconds
- **npm run lint:** Fast - 3 seconds, set timeout 30+ seconds

## Repository Commands Reference

### Frequently Used Commands Output

#### Repository root structure
```
ls -la
.git/               # Git repository
.github/            # GitHub workflows and templates  
.vscode/            # VS Code settings
src/                # TypeScript source code
dist/               # Compiled output (after build)
docs/               # Generated documentation
branding/           # Plugin branding assets
config.schema.json  # Homebridge configuration schema
package.json        # NPM package configuration
tsconfig.json       # TypeScript configuration
```

#### Package.json key scripts
```json
{
  "scripts": {
    "build": "npm run clean && tsc && npm run plugin-ui",
    "test": "vitest run", 
    "lint": "eslint src/**/*.ts",
    "watch": "npm run build && npm run plugin-ui && npm link && nodemon"
  }
}
```

#### Test output format
```
✓ src/settings.test.ts (7 tests)
✓ src/index.test.ts (1 test)
Test Files  2 passed (2)
Tests  8 passed (8)
```

This plugin integrates with external air quality APIs, so actual functionality testing requires valid API keys and network access to AirNow.gov or AQICN services.