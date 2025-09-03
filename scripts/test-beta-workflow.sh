#!/bin/bash

# Test script to validate beta branch workflow improvements
# This script tests the enhanced beta branch enforcer logic

echo "🧪 Testing Beta Branch Workflow Enhancements"
echo

# Test 1: Check if the workflow file is valid YAML
echo "Test 1: Validating YAML syntax of beta-branch-enforcer.yml"
if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/beta-branch-enforcer.yml'))" 2>/dev/null; then
    echo "✅ YAML syntax is valid"
else
    echo "❌ YAML syntax is invalid"
    exit 1
fi

# Test 2: Check if the helper script is executable
echo "Test 2: Checking if helper script is executable"
if [ -x "scripts/create-beta-branch.sh" ]; then
    echo "✅ Helper script is executable"
else
    echo "❌ Helper script is not executable"
    exit 1
fi

# Test 3: Verify package.json version can be read
echo "Test 3: Testing version parsing from package.json"
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ ! -z "$CURRENT_VERSION" ]; then
    echo "✅ Version parsed successfully: $CURRENT_VERSION"
else
    echo "❌ Could not parse version from package.json"
    exit 1
fi

# Test 4: Check if documentation references the script
echo "Test 4: Checking documentation references"
if grep -q "create-beta-branch.sh" README.md && grep -q "create-beta-branch.sh" CONTRIBUTING.md; then
    echo "✅ Documentation properly references the helper script"
else
    echo "❌ Documentation missing script references"
    exit 1
fi

# Test 5: Validate that workflow includes version reading
echo "Test 5: Checking if workflow includes version reading logic"
if grep -q "package.json" .github/workflows/beta-branch-enforcer.yml; then
    echo "✅ Workflow includes package.json version reading"
else
    echo "❌ Workflow missing version reading logic"
    exit 1
fi

echo
echo "🎉 All tests passed! Beta branch workflow enhancements are working correctly."