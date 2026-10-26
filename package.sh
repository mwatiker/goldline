#!/bin/sh
# Builds one store zip per browser from extension/ into dist/.
# The source manifest keeps both background forms and the Firefox id so it loads unpacked anywhere;
# each build keeps only what its store wants.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
for target in chrome firefox; do
  dir="dist/pkg-$target"
  cp -R extension "$dir"
  rm -f "$dir/.DS_Store"
  if [ "$target" = chrome ]; then
    jq 'del(.background.scripts) | del(.browser_specific_settings)' extension/manifest.json > "$dir/manifest.json"
  else
    jq 'del(.background.service_worker)' extension/manifest.json > "$dir/manifest.json"
  fi
  (cd "$dir" && zip -qr "../goldline-$target.zip" . -x '.DS_Store')
  echo "Built dist/goldline-$target.zip"
done
