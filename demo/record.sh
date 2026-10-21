#!/usr/bin/env bash
# Regenerate demo/pi-skills-anywhere.gif. Uses fixture skills only
# (demo/skills), a scratch project, and the installed pi + model.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v vhs >/dev/null || { echo "brew install vhs" >&2; exit 1; }
vhs demo/demo.tape
