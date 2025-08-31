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

## Pull Request and Branching Strategy

- **Target beta branches:** All PRs should target branches that start with "beta-" (e.g., beta-1.1.0, beta-2.0.0)
- **Version labeling:** Use semantic version labels to indicate change type:
  - `patch` - Bug fixes and minor improvements
  - `minor` - New features and functionality  
  - `major` - Breaking changes that require version bump
- **Beta workflow:** Features are developed in beta branches before being merged to main for release

# GitHub Copilot Instructions for homebridge-air

## Branch Strategy

### 🚨 IMPORTANT: Always Target Beta Branches First

**All pull requests MUST be directed to a branch that starts with "beta-" before being merged to the main branch.**

### Beta Branch Requirements

1. **Check for existing beta branch**: Look for branches with the pattern `beta-X.Y.Z` 
2. **If no beta branch exists**: Create one based on the next possible version following semantic versioning
3. **Beta branch naming**: Use format `beta-X.Y.Z` where X.Y.Z is the next version number

### Version Numbering

Current version can be found in `package.json`. The next version should follow semantic versioning:

- **Patch** (X.Y.Z+1): Bug fixes, security patches, minor corrections
- **Minor** (X.Y+1.0): New features, backwards-compatible functionality additions  
- **Major** (X+1.0.0): Breaking changes, major architectural changes

## Required Labels

### 🏷️ Semantic Versioning Labels

**These labels MUST be set on issues before assigning them to Copilot:**

- `patch`: For bug fixes and minor corrections that don't change functionality
- `minor`: For new features and enhancements that are backwards-compatible
- `major`: For breaking changes or major architectural modifications

### Additional Context Labels

- `enhancement`: For new features and improvements
- `bug`: For bug reports and fixes
- `dependencies`: For dependency updates
- `documentation`: For documentation-only changes

## Workflow Process

### Before Starting Work

1. **Verify Labels**: Ensure the issue has the appropriate semantic versioning label (`patch`, `minor`, or `major`)
2. **Check Beta Branch**: Verify there's an appropriate beta branch for the target version
3. **Create Beta Branch**: If no beta branch exists, create `beta-X.Y.Z` based on the label:
   - `patch`: Increment patch version (e.g., 1.0.2 → 1.0.3)
   - `minor`: Increment minor version (e.g., 1.0.2 → 1.1.0) 
   - `major`: Increment major version (e.g., 1.0.2 → 2.0.0)

### During Development

1. **Target Beta Branch**: Always create PRs against the appropriate beta branch
2. **Follow Code Standards**: Use existing linting and formatting rules
3. **Update Documentation**: Update relevant documentation if functionality changes
4. **Test Thoroughly**: Ensure all tests pass and functionality works as expected

### Branch Protection

- Direct pushes to `latest` (main) branch should be avoided
- All changes should go through beta branches first
- Beta branches should be thoroughly tested before merging to `latest`

## Examples

### Creating a Beta Branch for a Minor Feature

```bash
# For a new feature (minor version bump)
# Current version: 1.0.2
# New beta branch: beta-1.1.0

git checkout latest
git pull origin latest
git checkout -b beta-1.1.0
git push origin beta-1.1.0
```

### Creating a Beta Branch for a Bug Fix

```bash
# For a bug fix (patch version bump)  
# Current version: 1.0.2
# New beta branch: beta-1.0.3

git checkout latest
git pull origin latest
git checkout -b beta-1.0.3
git push origin beta-1.0.3
```

## Quality Gates

### Required Before Assignment to Copilot

- [ ] Issue has appropriate semantic versioning label (`patch`, `minor`, or `major`)
- [ ] Beta branch exists or can be created for the target version
- [ ] Requirements are clearly defined in the issue description

### Required Before PR Merge

- [ ] All tests pass
- [ ] Code follows existing style guidelines  
- [ ] Documentation is updated if needed
- [ ] PR targets the correct beta branch
- [ ] Semantic versioning label matches the changes made

## Notes

- The `latest` branch serves as the main development branch
- Beta branches are used for staging releases before they go to `latest`
- Always increment versions according to the semantic versioning standard
- When in doubt about versioning, err on the side of a higher version type (minor instead of patch, major instead of minor)