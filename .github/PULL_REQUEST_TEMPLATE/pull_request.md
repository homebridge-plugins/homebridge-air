---
name: Enhancement
about: Contribute to Plugin through Pull Request
title: ''
labels: 'enhancement'
assignees: 'donavanbecker'
---

## ⚠️ Beta Branch Requirement

**This PR must target a beta branch (beta-X.Y.Z) before merging to latest.**

**Current Version in package.json:** Check the version and ensure your target beta branch increments it correctly.

- [ ] This PR targets a beta branch that starts with "beta-"
- [ ] The target version matches the semantic versioning label on the related issue  
- [ ] Required labels (patch/minor/major) are set on the related issue
- [ ] I have checked that the appropriate beta branch exists or created it if needed

**Quick Reference:**
- `patch` (bug fix): 1.0.4 → beta-1.0.5
- `minor` (new feature): 1.0.4 → beta-1.1.0
- `major` (breaking change): 1.0.4 → beta-2.0.0

## Description

**Is your enhancement related to a problem? Please describe.**

<!-- A clear and concise description of what the problem is. Ex. I'm always frustrated when [...] -->

**Describe the solution you are adding**

<!-- A clear and concise description of what you want to happen. -->

**Changes Proposed in this Pull Request**

<!-- A clear and concise description of what is being changed. -->

## Semantic Versioning

- [ ] `patch`: Bug fixes, security patches, minor corrections
- [ ] `minor`: New features, backwards-compatible functionality additions  
- [ ] `major`: Breaking changes, major architectural changes

## Testing

- [ ] All existing tests pass
- [ ] New tests added for new functionality (if applicable)
- [ ] Manual testing completed
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

## Additional Context

**Describe alternatives you've considered**

<!-- A clear and concise description of any alternative solutions or features you've considered. -->

**Related Issues**

<!-- Link to related issues using "Fixes #X" or "Closes #X" -->

**Screenshots/Videos**

<!-- Add any screenshots or videos demonstrating the changes (if applicable) -->

**Additional context**

<!-- Add any other context about the pull request here. -->
