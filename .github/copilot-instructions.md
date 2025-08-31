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