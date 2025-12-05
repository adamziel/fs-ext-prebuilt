#!/usr/bin/env bash
set -euo pipefail

# Fetch the latest ABI registry from the Node.js repository
if [ ! -f "abi-registry.json" ]; then
    echo "Fetching ABI registry..."
    curl -s -o "abi-registry.json" "https://raw.githubusercontent.com/nodejs/node/main/doc/abi_version_registry.json"
fi

# Fetch the Electron version from Studio's package.json
echo "Fetching Electron version from Studio..."
ELECTRON_VERSION=$(curl -s "https://raw.githubusercontent.com/Automattic/studio/trunk/package.json" | python3 -c "
import json
import sys
data = json.load(sys.stdin)
# Check devDependencies first, then dependencies
electron = data.get('devDependencies', {}).get('electron') or data.get('dependencies', {}).get('electron', '')
# Strip any semver prefixes like ^, ~, etc.
print(electron.lstrip('^~>=<'))
")

echo "Studio uses Electron v$ELECTRON_VERSION"

# Get all stable Node.js version strings >= 20.0.0
# We extract the version strings (e.g., "20.0.0", "22.0.0") for stable releases
NODE_VERSIONS=$(python3 -c "
import json
import re

with open('abi-registry.json') as f:
    data = json.load(f)

# Filter for stable Node.js versions >= 20
versions = []
for entry in data['NODE_MODULE_VERSION']:
    if entry.get('runtime') != 'node':
        continue
    version_str = entry.get('versions', '')
    # Skip pre-release versions
    if version_str.endswith('-pre'):
        continue
    # Extract major version number
    match = re.match(r'^(\d+)\.', version_str)
    if not match:
        continue
    major = int(match.group(1))
    if major >= 20:
        versions.append(version_str)

# Deduplicate and sort by major version descending
seen = set()
unique_versions = []
for v in versions:
    if v not in seen:
        seen.add(v)
        unique_versions.append(v)

# Sort by major version descending
unique_versions.sort(key=lambda x: int(x.split('.')[0]), reverse=True)
print(' '.join(unique_versions))
")

echo "Building prebuilds for Node.js versions: $NODE_VERSIONS"
rm -rf prebuilds/ binaries/
mkdir -p binaries/

# Build for each target Node.js version
for VERSION in $NODE_VERSIONS; do
    echo ""
    echo "=== Building for Node.js v$VERSION ==="
    npx prebuildify --arch=x86_64+arm --strip --tag-libc --target=node@$VERSION
	OSDIR=$(ls prebuilds/ | head -n1)
	cp prebuilds/$OSDIR/fs-ext.glibc.node binaries/fs-ext-$OSDIR-node-$VERSION.node
	rm -rf prebuilds/
done

# Build for Electron (used by Studio)
echo ""
echo "=== Building for Electron v$ELECTRON_VERSION ==="
npx prebuildify --arch=x86_64+arm --strip --tag-libc --target=electron@$ELECTRON_VERSION
OSDIR=$(ls prebuilds/ | head -n1)
cp prebuilds/$OSDIR/fs-ext.glibc.node binaries/fs-ext-$OSDIR-electron-$ELECTRON_VERSION.node
rm -rf prebuilds/

echo ""
echo "=== Build complete ==="
echo "Prebuilds are available in the prebuilds/ directory"
ls -la prebuilds/
