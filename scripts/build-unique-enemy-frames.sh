#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sprite_dir="$root/public/sprites"

split_sheet() {
  local id="$1"
  local frame_width="$2"
  local frame_height="$3"
  shift 3
  local source="$sprite_dir/$id.png"
  local output_dir="$sprite_dir/frames/$id"
  mkdir -p "$output_dir"

  for animation in "$@"; do
    local name="${animation%%:*}"
    local spec="${animation#*:}"
    local row="${spec%%:*}"
    local frames="${spec#*:}"
    local clip_top=0

    if [[ "$spec" == *:*:* ]]; then
      row="${spec%%:*}"
      local remainder="${spec#*:}"
      frames="${remainder%%:*}"
      clip_top="${remainder#*:}"
    fi

    find "$output_dir" -maxdepth 1 -type f -name "$name-*.png" -delete
    for ((col = 0; col < frames; col += 1)); do
      local y=$((row * frame_height + clip_top))
      local height=$((frame_height - clip_top))
      convert "$source" \
        -crop "${frame_width}x${height}+$((col * frame_width))+$y" \
        +repage -depth 8 -define png:color-type=6 \
        "$output_dir/$name-$(printf '%02d' "$col").png"
    done
  done
}

# Each class keeps its authored sheet, silhouette, and action rows.
split_sheet grunt 64 64 "walk:0:4" "windup:1:3" "attack:2:3" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet runner 64 64 "walk:0:6" "windup:1:3" "attack:2:4" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet shield 80 80 "walk:0:4" "windup:1:3" "attack:2:3" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet tank 96 96 "walk:0:4" "windup:1:4" "attack:2:4" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet glitch 80 80 "walk:0:6" "windup:1:3" "attack:2:4" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet boss 160 160 "walk:0:4" "windup:1:4" "attack:2:4" "recover:3:3" "hurt:4:2" "dead:5:4" "specialAttack:6:5"

printf 'unique enemy frames generated under %s/frames\n' "$sprite_dir"
