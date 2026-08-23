#!/usr/bin/env bash
set -euo pipefail

build_dir="${1:-dist-public}"
bucket="${EVA_FONT_COS_BUCKET:-eva-fonts-prod-assets-1302538683}"

if [[ ! -f "$build_dir/fonts.css" || ! -f "$build_dir/font-manifest.json" || ! -d "$build_dir/fonts" ]]; then
  echo "Refusing to publish: expected fonts.css, font-manifest.json and fonts/ in $build_dir" >&2
  exit 1
fi

unexpected="$(find "$build_dir" -type f ! -name '*.woff2' ! -name 'fonts.css' ! -name 'font-manifest.json' -print -quit)"
if [[ -n "$unexpected" ]]; then
  echo "Refusing to publish unexpected file: $unexpected" >&2
  exit 1
fi

tccli cos sync_upload \
  --bucket "$bucket" \
  --local_path "$build_dir" \
  --cos_key public/ \
  --recursive true \
  --routines 4 \
  --thread_num 4 \
  --retry 5

echo "Published approved build to cos://$bucket/public/"
