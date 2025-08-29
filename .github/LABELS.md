# GitHub Labels Configuration

This file documents the required labels for the homebridge-air repository to support the beta branch strategy and semantic versioning workflow.

## Required Semantic Versioning Labels

These labels **MUST** be created in the GitHub repository and applied to issues before assignment to Copilot:

### `patch`
- **Color**: `#d4c5f9` (light purple)
- **Description**: Bug fixes, security patches, minor corrections (X.Y.Z+1)
- **Usage**: For issues that fix bugs without changing functionality

### `minor` 
- **Color**: `#0e8a16` (green)
- **Description**: New features, backwards-compatible functionality (X.Y+1.0)
- **Usage**: For issues that add new features or enhancements

### `major`
- **Color**: `#d93f0b` (red)  
- **Description**: Breaking changes, major architectural changes (X+1.0.0)
- **Usage**: For issues that introduce breaking changes

## Existing Labels (Auto-applied by Labeler)

These labels are automatically applied based on file changes:

- `beta`: Applied to PRs targeting beta-* branches
- `latest`: Applied to PRs targeting latest branch  
- `enhancement`: Applied to changes in src/ or config.schema.json
- `dependencies`: Applied to package.json changes
- `docs`: Applied to .md file changes
- `branding`: Applied to branding/ folder changes
- `workflow`: Applied to .github/ folder changes

## Creating Labels via GitHub CLI

If you have the GitHub CLI installed, you can create the required labels:

```bash
# Create semantic versioning labels
gh label create "patch" --description "Bug fixes, security patches, minor corrections (X.Y.Z+1)" --color "d4c5f9"
gh label create "minor" --description "New features, backwards-compatible functionality (X.Y+1.0)" --color "0e8a16"  
gh label create "major" --description "Breaking changes, major architectural changes (X+1.0.0)" --color "d93f0b"
```

## Creating Labels via GitHub Web Interface

1. Go to the repository on GitHub
2. Click "Issues" tab
3. Click "Labels" 
4. Click "New label"
5. Enter the name, description, and color for each label above

## Label Usage Workflow

1. **Issue Creation**: Apply appropriate semantic versioning label (`patch`/`minor`/`major`)
2. **Copilot Assignment**: Only assign issues that have semantic versioning labels
3. **Beta Branch**: Copilot creates or uses existing beta branch based on label
4. **PR Creation**: PRs automatically get `beta` label when targeting beta branches
5. **Merge**: After testing, beta branches are merged to `latest`

## Notes

- The semantic versioning labels must be manually applied to issues
- The labeler cannot automatically determine semantic impact
- All three semantic labels should exist even if not immediately used
- These labels help automate version bumping and release processes