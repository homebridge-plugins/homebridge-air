#!/bin/bash
# check-version-conflict.sh
# Check if the current package.json version conflicts with published NPM versions

set -euo pipefail

PKG_NAME=$(node -p "require('./package.json').name")
PKG_VERSION=$(node -p "require('./package.json').version")

echo "Checking version conflict for ${PKG_NAME}@${PKG_VERSION}"

if npm view "${PKG_NAME}@${PKG_VERSION}" version > /dev/null 2>&1; then
    echo "❌ CONFLICT: Version ${PKG_VERSION} already exists on NPM"
    echo ""
    echo "Latest published versions:"
    npm view "${PKG_NAME}" versions --json | tail -10
    echo ""
    echo "To fix:"
    echo "1. Update package.json version to the next available version"
    echo "2. For beta versions, use: npm version prerelease --preid=beta --no-git-tag-version"
    echo "3. For patch versions, use: npm version patch --no-git-tag-version"
    exit 1
else
    echo "✅ OK: Version ${PKG_VERSION} does not exist on NPM - safe to publish"
fi