#!/bin/bash

set -euo pipefail

if [ -f package-lock.json ]; then
  npm ci
elif [ -f package.json ]; then
  npm install
fi
