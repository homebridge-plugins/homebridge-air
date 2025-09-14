#!/bin/bash
# fix-beta-version.sh
# Fix version conflicts on beta branches by incrementing to next available beta version

set -euo pipefail

PKG_NAME=$(node -p "require('./package.json').name")
PKG_VERSION=$(node -p "require('./package.json').version")

echo "Fixing beta version conflict for ${PKG_NAME}@${PKG_VERSION}"

# Check if current version exists on NPM
if npm view "${PKG_NAME}@${PKG_VERSION}" version > /dev/null 2>&1; then
    echo "Current version ${PKG_VERSION} already exists on NPM"
    
    # If it's a beta version, increment it
    if [[ $PKG_VERSION == *"-beta."* ]]; then
        echo "Incrementing beta version..."
        npm version prerelease --preid=beta --no-git-tag-version
        NEW_VERSION=$(node -p "require('./package.json').version")
        echo "Updated version to: ${NEW_VERSION}"
        
        # Verify new version doesn't exist
        if npm view "${PKG_NAME}@${NEW_VERSION}" version > /dev/null 2>&1; then
            echo "❌ New version ${NEW_VERSION} also exists on NPM!"
            echo "Manual intervention required."
            exit 1
        else
            echo "✅ New version ${NEW_VERSION} is safe to publish"
        fi
    else
        echo "❌ Not a beta version - manual version update required"
        exit 1
    fi
else
    echo "✅ Current version ${PKG_VERSION} is safe to publish"
fi