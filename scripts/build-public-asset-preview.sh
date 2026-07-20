#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$root/public/assets/public/warped-city"
output="$root/mockups/public-assets/public-runtime-asset-preview.png"
public_output="$root/public/public-asset-previews/public-runtime-asset-preview.png"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

sources=(
  "player/idle-1.png"
  "player/run-1.png"
  "player/run-shoot-1.png"
  "player/shoot.png"
  "enemies/drone-1.png"
  "enemies/turret-1.png"
  "effects/shot-1.png"
  "effects/shot-2.png"
  "effects/shot-3.png"
  "effects/enemy-explosion-1.png"
  "effects/enemy-explosion-2.png"
  "effects/enemy-explosion-3.png"
  "effects/enemy-explosion-4.png"
  "effects/enemy-explosion-5.png"
  "effects/enemy-explosion-6.png"
)

index=0
for source in "${sources[@]}"; do
  output_frame="$work_dir/$(printf '%02d' "$index").png"
  convert "$source_dir/$source" \
    -filter point -resize 300% \
    -background "#0b0918" -gravity center -extent 220x180 \
    -bordercolor "#332652" -border 2 \
    -label "$source" "$output_frame"
  index=$((index + 1))
done

mkdir -p "$(dirname "$output")"
mkdir -p "$(dirname "$public_output")"
montage "$work_dir"/*.png \
  -tile 5x3 -geometry +14+28 \
  -background "#0b0918" -fill "#fff4d5" -pointsize 14 \
  -title "SPACEBLADE  ·  WARPED CITY PUBLIC RUNTIME ASSETS" \
  "$output"
cp "$output" "$public_output"
printf 'public runtime asset preview generated at %s\n' "$output"
