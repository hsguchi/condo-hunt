#!/bin/bash

set -euo pipefail

mkdir -p /root/.local/share/opencode
if [ -d /tmp/opencode-host ] && [ -z "$(find /root/.local/share/opencode -mindepth 1 -maxdepth 1 2>/dev/null)" ]; then
  cp -a /tmp/opencode-host/. /root/.local/share/opencode/
fi

mkdir -p /root/.gsd
if [ -d /tmp/gsd-host ]; then
  cp -a /tmp/gsd-host/. /root/.gsd/
fi
mkdir -p /root/.gsd/sessions
if [ -d /tmp/gsd-host/sessions ] && [ -z "$(find /root/.gsd/sessions -mindepth 1 -maxdepth 1 2>/dev/null)" ]; then
  cp -a /tmp/gsd-host/sessions/. /root/.gsd/sessions/
fi

if [ -f package-lock.json ]; then
  npm ci
elif [ -f package.json ]; then
  npm install
fi
