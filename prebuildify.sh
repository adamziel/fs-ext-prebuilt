#!/usr/bin/env bash
set -euo pipefail

# Thin wrapper so existing docs/links keep working.
# The heavy lifting now lives in prebuildify.js which runs on macOS, Linux, and Windows.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "${SCRIPT_DIR}/prebuildify.js" "$@"
