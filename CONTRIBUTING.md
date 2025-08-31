# Contributing to homebridge-air

Thank you for considering contributing to homebridge-air! This guide will help you understand our workflow and requirements.

## 🚨 Important: Beta Branch Strategy

**All pull requests MUST target a beta branch first, not the `latest` branch directly.**

## Before You Start

### Required Labels on Issues

Before any issue can be assigned to GitHub Copilot or worked on, it must have one of these semantic versioning labels:

- ![patch](https://img.shields.io/badge/-patch-yellow) **patch**: Bug fixes, security patches, minor corrections that don't change functionality
- ![minor](https://img.shields.io/badge/-minor-blue) **minor**: New features and enhancements that are backwards-compatible  
- ![major](https://img.shields.io/badge/-major-red) **major**: Breaking changes or major architectural modifications

### Check for Beta Branch

1. Look for an existing beta branch with pattern `beta-X.Y.Z`
2. If none exists, create one based on the semantic versioning label:
   - **patch**: Increment patch version (1.0.2 → 1.0.3)
   - **minor**: Increment minor version (1.0.2 → 1.1.0)
   - **major**: Increment major version (1.0.2 → 2.0.0)

## Development Workflow

### 1. Setting Up

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/homebridge-air.git
cd homebridge-air

# Install dependencies
npm install

# Build the project
npm run build

# Run linting
npm run lint
```

### 2. Creating a Beta Branch (if needed)

```bash
# Switch to latest branch
git checkout latest
git pull origin latest

# Create beta branch for your version
git checkout -b beta-1.0.3  # or appropriate version
git push origin beta-1.0.3
```

### 3. Working on Your Feature/Fix

```bash
# Create feature branch from beta branch
git checkout beta-1.0.3  # or appropriate beta branch
git checkout -b feature/your-feature-name

# Make your changes
# ... code changes ...

# Test your changes
npm run lint
npm run build
npm test  # if tests exist

# Commit your changes
git add .
git commit -m "feat: add new feature description"
```

### 4. Creating a Pull Request

1. **Target the beta branch** (not `latest`)
2. **Fill out the PR template** completely
3. **Ensure all checkboxes are completed**
4. **Reference the related issue** using "Fixes #X" or "Closes #X"

## Code Standards

### TypeScript/JavaScript

- Follow the existing ESLint configuration
- Use TypeScript for type safety
- Keep functions focused and well-documented
- Use consistent naming conventions

### Testing

- Run `npm run lint` before committing
- Run `npm run build` to ensure compilation succeeds
- Test your changes manually if automated tests don't exist

### Documentation

- Update README.md if you add new features
- Update JSDoc comments for public methods
- Update config.schema.json if you add configuration options

## Semantic Versioning Guide

### Patch (X.Y.Z+1)
- Bug fixes
- Security patches  
- Dependency updates (patch level)
- Documentation fixes
- Code cleanup without functional changes

### Minor (X.Y+1.0)
- New features
- New configuration options
- Enhanced functionality
- Backwards-compatible API changes
- Dependency updates (minor level)

### Major (X+1.0.0)
- Breaking changes
- Removed features
- Changed APIs that break backwards compatibility
- Major architectural changes
- Dependency updates (major level)

## Release Process

1. **Development**: Work happens in feature branches from beta branches
2. **Beta Release**: Changes are merged to beta branches and tested
3. **Production Release**: Beta branches are merged to `latest` after thorough testing

## Getting Help

- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub discussions for questions and general discussion
- **Documentation**: Check the [Wiki](https://github.com/homebridge-plugins/homebridge-air/wiki) for detailed guides

## Code of Conduct

Please be respectful and considerate when contributing. We want to maintain a welcoming environment for all contributors.

## Quick Checklist

Before submitting a PR, make sure:

- [ ] Issue has the correct semantic versioning label (patch/minor/major)
- [ ] Beta branch exists for the target version
- [ ] Your PR targets the beta branch, not `latest`
- [ ] All code follows the linting rules (`npm run lint` passes)
- [ ] Project builds successfully (`npm run build` passes)
- [ ] PR template is completely filled out
- [ ] Related issue is referenced with "Fixes #X"

Thank you for contributing! 🎉