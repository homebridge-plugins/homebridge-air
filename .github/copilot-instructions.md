# GitHub Copilot Instructions for Homebridge Air Plugin

Homebridge Air is a TypeScript plugin for Homebridge that allows monitoring air quality data from AirNow and AQICN providers through HomeKit and Siri.

**Always reference these instructions first** and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## 🚨 CRITICAL: Beta Branch Workflow Requirements

### Branch Strategy
**ALL pull requests MUST target a branch that starts with "beta-" before being merged to the main branch.**

1. **Check for existing beta branch**: Look for branches with pattern `beta-X.Y.Z`
2. **If no beta branch exists**: Create one based on the next semantic version
3. **Beta branch naming**: Use format `beta-X.Y.Z` where X.Y.Z is the next version number

### Required Labels Before Assignment
**These labels MUST be set on issues before assigning them to Copilot:**

- 🏷️ `patch` - Bug fixes and minor corrections that don't change functionality
- 🏷️ `minor` - New features and enhancements that are backwards-compatible  
- 🏷️ `major` - Breaking changes or major architectural modifications

### Version Numbering (check `package.json` for current version)
- **Patch** (X.Y.Z+1): Bug fixes, security patches, minor corrections
- **Minor** (X.Y+1.0): New features, backwards-compatible functionality additions
- **Major** (X+1.0.0): Breaking changes, major architectural changes

## Essential Development Commands

### 🔧 Setup and Build
- `npm install` — **30-45 seconds. NEVER CANCEL. Set timeout to 120+ seconds.**
- `npm run build` — **5 seconds.** Runs clean, tsc, and plugin-ui tasks
- `npm run clean` — Removes the dist folder

### ✅ Validation (REQUIRED before committing)
- `npm run lint` — **3 seconds. REQUIRED before committing or CI will fail**
- `npm run lint:fix` — Automatically fixes linting issues
- `npm test` — **1 second.** Runs Vitest test suite with 8 tests
- `npm run build` — Verify your changes compile correctly

### 🧪 Testing and Development
- `npm run test:watch` — Runs tests in watch mode
- `npm run test-coverage` — Runs tests with coverage report
- `npm run watch` — **NEVER CANCEL. Takes 10+ seconds to start. Set timeout to 300+ seconds.**
  - Builds, links plugin globally, and starts Homebridge in development mode
  - Monitors src/**/* and config.schema.json for changes
  - Homebridge starts on random port with QR code for iOS pairing

### 📚 Documentation
- `npm run docs` — **2 seconds.** Generates TypeDoc documentation in ./docs

## Development Workflow Steps

### 1️⃣ Before Starting Work
- [ ] **Verify Labels**: Ensure issue has semantic versioning label (`patch`, `minor`, or `major`)
- [ ] **Check Beta Branch**: Look for existing `beta-X.Y.Z` branch for target version
- [ ] **Create Beta Branch**: If none exists, create one based on the semantic label:
  ```bash
  # For patch (bug fix): 1.0.2 → 1.0.3
  git checkout latest && git pull origin latest
  git checkout -b beta-1.0.3 && git push origin beta-1.0.3
  
  # For minor (feature): 1.0.2 → 1.1.0  
  git checkout latest && git pull origin latest
  git checkout -b beta-1.1.0 && git push origin beta-1.1.0
  
  # For major (breaking): 1.0.2 → 2.0.0
  git checkout latest && git pull origin latest
  git checkout -b beta-2.0.0 && git push origin beta-2.0.0
  ```

### 2️⃣ Development Process
1. **Always lint first**: `npm run lint`
2. **Make changes** in appropriate src/ files
3. **Add/update tests** if needed
4. **Validate iteratively**: `npm run build && npm test`
5. **Test in development**: `npm run watch` and verify functionality
6. **Final validation**: `npm run lint` before committing

### 3️⃣ Quality Gates Before PR Merge
- [ ] All tests pass (`npm test`)
- [ ] Code follows style guidelines (`npm run lint`)
- [ ] Documentation updated if functionality changes
- [ ] PR targets correct beta branch
- [ ] Semantic versioning label matches changes made

## Manual Validation Scenarios

### Platform Changes
- Run `npm run watch` and verify Homebridge starts without errors
- Check that plugin loads as "@homebridge-plugins/homebridge-air.Air" platform
- Verify functionality with valid API keys for AirNow or AQICN services

### UI Changes  
- Ensure `npm run plugin-ui` completes successfully
- Verify files are copied to `dist/homebridge-ui/public/`

### Configuration Changes
- Validate schema changes against `config.schema.json` structure
- Test configuration loading in development mode

## System Requirements

- **Node.js**: Version 20 or 22 (specified in package.json engines)
- **Homebridge**: Version 1.9.0+ or 2.0.0+ (available via npx homebridge)
- **Development tools**: All dependencies install via npm install

## Repository Structure

### 📁 Source Code Organization
```
src/
├── index.ts                    # Main plugin entry point - registers platform
├── platform.ts                # AirPlatform class - main plugin logic  
├── settings.ts                 # Configuration interfaces and utilities
├── devices/
│   ├── device.ts              # Base device class
│   └── airqualitysensor.ts    # Air quality sensor implementation
└── homebridge-ui/
    ├── server.ts              # Custom Homebridge UI server
    └── public/                # UI assets
```

### ⚙️ Configuration Files
| File | Purpose |
|------|---------|
| `config.schema.json` | Homebridge UI configuration schema with provider options (AirNow/AQICN) |
| `package.json` | Node.js project configuration with all npm scripts |
| `tsconfig.json` | TypeScript compilation settings |
| `eslint.config.js` | ESLint configuration using @antfu/eslint-config |
| `nodemon.json` | Development server configuration for watch mode |

### 📦 Build Outputs
- `dist/` — Compiled JavaScript and type definitions
- `docs/` — Generated TypeDoc documentation  
- `coverage/` — Test coverage reports

## Common Development Tasks

### 🆕 Adding New Features
1. `npm run lint` — Always lint first
2. Make changes in appropriate `src/` files
3. Add tests if the feature needs test coverage
4. `npm run build && npm test` — Build and validate
5. `npm run watch` — Test in development environment
6. `npm run lint` — Final validation before commit

### 🐛 Debugging Issues  
1. `npm run build` — Check for TypeScript compilation errors
2. `npm test` — Review test results for failures
3. `npm run watch` — Test in live Homebridge environment with detailed logs
4. Check Homebridge logs for runtime errors during watch mode

### ⚙️ Configuration Updates
- **Schema changes**: Modify `config.schema.json` for new configuration options
- **Platform config**: Update `AirPlatformConfig` interface in `settings.ts`  
- **UI updates**: Modify `src/homebridge-ui/` files and run `npm run plugin-ui`

## ⚠️ Critical Timing and Timeout Requirements

| Command | Duration | Timeout Setting | Notes |
|---------|----------|----------------|-------|
| `npm install` | 30-45 seconds | **120+ seconds** | **NEVER CANCEL** |
| `npm run watch` | 10+ seconds to start | **300+ seconds** | **NEVER CANCEL** - runs indefinitely |
| `npm run build` | ~5 seconds | 30+ seconds | Fast compilation |
| `npm test` | ~1 second | 30+ seconds | Very fast test suite |
| `npm run lint` | ~3 seconds | 30+ seconds | Fast linting |

## Reference Information

### Expected Command Outputs

#### Repository Structure
```bash
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

#### Key Package.json Scripts
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

#### Test Output Format
```bash
✓ src/settings.test.ts (7 tests)
✓ src/index.test.ts (1 test)
Test Files  2 passed (2)
Tests  8 passed (8)
```

### Important Notes
- This plugin integrates with external air quality APIs (AirNow.gov and AQICN)
- Actual functionality testing requires valid API keys and network access
- The `latest` branch serves as the main development branch  
- Beta branches are used for staging releases before merging to `latest`
- Always increment versions according to semantic versioning standard
- When in doubt about versioning, err on the side of a higher version type