#!/usr/bin/env bash
set -euo pipefail

# Build inspection-only plates with a real border around every proposed frame.
# The border is deliberately outside the artwork, so the next cutter can use
# the border as the source of truth instead of guessing from alpha bounds.
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$root/public/sprites"
output_dir="$root/mockups/bordered-sprites"
mkdir -p "$output_dir"

make_plate() {
  local id="$1" frame_width="$2" frame_height="$3" columns="$4" rows="$5" row_specs="$6"
  local source="$source_dir/$id.png"
  local work_dir="$output_dir/.${id}"
  local card_width=$((frame_width * 2 + 32))
  local card_height=$((frame_height * 2 + 32))
  local border_color="#ff4fd8"
  local index=0
  local row=0
  rm -rf "$work_dir"
  mkdir -p "$work_dir"

  for row_spec in $row_specs; do
    local action="${row_spec%%:*}"
    local frame_count="${row_spec#*:}"
    for ((col = 0; col < frame_count; col += 1)); do
      local x=$((col * frame_width))
      local y=$((row * frame_height))
      local label="${action}-$(printf '%02d' "$col")"
      local tile="$work_dir/$(printf '%04d' "$index")-${label}.png"
      # Keep the original cell as the source, then center it inside a larger
      # card. This gives effects room without cutting the source artwork.
      convert "$source" -crop "${frame_width}x${frame_height}+${x}+${y}" +repage \
        -trim +repage -background none -gravity center -extent "${card_width}x${card_height}" \
        -bordercolor "$border_color" -border 4 "$tile"
      index=$((index + 1))
    done
    row=$((row + 1))
  done

  montage "$work_dir"/*.png -background "#06111f" -tile 4x -geometry +24+24 "$output_dir/${id}-bordered.png"
  {
    printf '{\n  "actor": "%s",\n  "cardWidth": %d,\n  "cardHeight": %d,\n  "border": "#ff4fd8",\n  "frames": [\n' "$id" "$((card_width + 8))" "$((card_height + 8))"
    local first=1
    for frame in "$work_dir"/*.png; do
      local file="$(basename "$frame")"
      local label="${file#*-}"
      label="${label%.png}"
      [[ $first -eq 0 ]] && printf ',\n'
      first=0
      printf '    {"label": "%s", "file": "%s"}' "$label" "$file"
    done
    printf '\n  ]\n}\n'
  } > "$output_dir/${id}-bordered.json"
  mkdir -p "$root/public/sprite-guides/bordered"
  cp "$output_dir/${id}-bordered.png" "$root/public/sprite-guides/bordered/"
  cp "$output_dir/${id}-bordered.json" "$root/public/sprite-guides/bordered/"
  rm -rf "$work_dir"
  printf '%s -> %s\n' "$id" "$output_dir/${id}-bordered.png"
}

make_plate player 96 96 6 9 "idle:4 walk:6 slash:4 charge:3 heavy:6 dodge:3 parry:2 hurt:2 dead:2"
make_plate grunt 64 64 4 6 "walk:4 windup:3 attack:3 recover:2 hurt:2 dead:3"
make_plate runner 64 64 6 6 "walk:6 windup:3 attack:4 recover:2 hurt:2 dead:3"
make_plate shield 80 80 4 6 "walk:4 windup:3 attack:3 recover:2 hurt:2 dead:3"
make_plate tank 96 96 4 6 "walk:4 windup:4 attack:4 recover:2 hurt:2 dead:3"
make_plate glitch 80 80 6 6 "walk:6 windup:3 attack:4 recover:2 hurt:2 dead:3"
make_plate boss 160 160 5 7 "walk:4 windup:4 attack:4 recover:3 hurt:2 dead:4 specialAttack:5"

montage "$output_dir"/*-bordered.png -background "#06111f" -thumbnail 420x420 \
  -tile 2x -geometry +18+36 "$output_dir/overview.png"
cp "$output_dir/overview.png" "$root/public/sprite-guides/bordered/"
