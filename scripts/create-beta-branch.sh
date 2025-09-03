#!/bin/bash

# Create Beta Branch Script
# This script helps create the appropriate beta branch based on semantic versioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Beta Branch Creator for homebridge-air${NC}"
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the repository root.${NC}"
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: ${CURRENT_VERSION}${NC}"

# Parse version components
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

echo
echo "Select the type of change:"
echo -e "${GREEN}1) patch${NC} - Bug fixes, security patches, minor corrections (${CURRENT_VERSION} → ${MAJOR}.${MINOR}.$((PATCH + 1)))"
echo -e "${YELLOW}2) minor${NC} - New features, backwards-compatible functionality (${CURRENT_VERSION} → ${MAJOR}.$((MINOR + 1)).0)"
echo -e "${RED}3) major${NC} - Breaking changes, major architectural changes (${CURRENT_VERSION} → $((MAJOR + 1)).0.0)"
echo

read -p "Enter your choice (1-3): " CHOICE

case $CHOICE in
    1)
        NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
        TYPE="patch"
        ;;
    2)
        NEW_VERSION="${MAJOR}.$((MINOR + 1)).0"
        TYPE="minor"
        ;;
    3)
        NEW_VERSION="$((MAJOR + 1)).0.0"
        TYPE="major"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

BETA_BRANCH="beta-${NEW_VERSION}"

echo
echo -e "${BLUE}🎯 Target beta branch: ${BETA_BRANCH}${NC}"
echo -e "${BLUE}📝 Change type: ${TYPE}${NC}"

# Check if branch already exists
if git show-ref --verify --quiet refs/heads/${BETA_BRANCH}; then
    echo -e "${YELLOW}⚠️  Branch ${BETA_BRANCH} already exists locally.${NC}"
    read -p "Do you want to switch to it? (y/n): " SWITCH
    if [[ $SWITCH =~ ^[Yy]$ ]]; then
        git checkout ${BETA_BRANCH}
        echo -e "${GREEN}✅ Switched to existing branch ${BETA_BRANCH}${NC}"
    fi
    exit 0
fi

# Check if branch exists on remote
if git ls-remote --heads origin ${BETA_BRANCH} | grep ${BETA_BRANCH} > /dev/null; then
    echo -e "${YELLOW}⚠️  Branch ${BETA_BRANCH} exists on remote.${NC}"
    read -p "Do you want to check it out? (y/n): " CHECKOUT
    if [[ $CHECKOUT =~ ^[Yy]$ ]]; then
        git fetch origin ${BETA_BRANCH}:${BETA_BRANCH}
        git checkout ${BETA_BRANCH}
        echo -e "${GREEN}✅ Checked out remote branch ${BETA_BRANCH}${NC}"
    fi
    exit 0
fi

echo
read -p "Create and push new beta branch ${BETA_BRANCH}? (y/n): " CONFIRM

if [[ $CONFIRM =~ ^[Yy]$ ]]; then
    # Make sure we're on latest and up to date
    echo -e "${BLUE}🔄 Switching to latest branch and pulling updates...${NC}"
    git checkout latest
    git pull origin latest
    
    # Create and switch to beta branch
    echo -e "${BLUE}🌿 Creating beta branch ${BETA_BRANCH}...${NC}"
    git checkout -b ${BETA_BRANCH}
    
    # Push to remote
    echo -e "${BLUE}📤 Pushing to remote...${NC}"
    git push origin ${BETA_BRANCH}
    
    echo
    echo -e "${GREEN}✅ Success! Beta branch ${BETA_BRANCH} created and pushed.${NC}"
    echo
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Make your changes"
    echo "2. Create a PR targeting the ${BETA_BRANCH} branch (not latest)"
    echo "3. Ensure your issue has the '${TYPE}' label"
    echo "4. Follow the normal review process"
    echo
else
    echo -e "${YELLOW}ℹ️  Operation cancelled.${NC}"
fi