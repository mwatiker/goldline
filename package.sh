#!/bin/sh
# Builds dist/goldline.zip from extension/ for store upload.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
(cd extension && zip -qr ../dist/goldline.zip . -x '.DS_Store')
echo "Built dist/goldline.zip"
