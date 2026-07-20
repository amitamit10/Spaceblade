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

    for ((col = 0; col < frames; col += 1)); do
      local y=$((row * frame_height + clip_top))
      local height=$((frame_height - clip_top))
      local filename
      printf -v filename "%s/%s-%02d.png" "$output_dir" "$name" "$col"
      convert "$source" -crop "${frame_width}x${height}+$((col * frame_width))+$y" +repage "$filename"
    done
  done
}

split_player_action_frames() {
  local source="$sprite_dir/player.png"
  local output_dir="$sprite_dir/frames/player"
  local name="$1"
  local row="$2"
  local clip_top="$3"
  shift 3

  find "$output_dir" -maxdepth 1 -type f -name "$name-*.png" -delete

  local frame_index=0
  for source_x in "$@"; do
    local y=$((row * 96 + clip_top))
    local height=$((96 - clip_top))
    convert "$source" -crop "96x${height}+${source_x}+$y" +repage \
      "$output_dir/$name-$(printf '%02d' "$frame_index").png"
    frame_index=$((frame_index + 1))
  done
}

split_sheet player 96 96 \
  "idle:0:4" "walk:1:6"
# These are source windows around the real populated poses in the supplied sheet.
split_player_action_frames slash 2 24 0 96 192 384
split_player_action_frames charge 3 24 0 32 192
split_player_action_frames heavy 4 24 0 96 192 288 384 480
split_player_action_frames dodge 5 24 0 96 192
split_player_action_frames parry 6 24 0 96
split_player_action_frames hurt 7 24 0 96
split_player_action_frames dead 8 24 0 96
split_sheet grunt 64 64 "walk:0:4" "windup:1:3" "attack:2:3" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet runner 64 64 "walk:0:6" "windup:1:3" "attack:2:4" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet shield 80 80 "walk:0:4" "windup:1:3" "attack:2:3" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet tank 96 96 "walk:0:4" "windup:1:4" "attack:2:4" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet glitch 80 80 "walk:0:6" "windup:1:3" "attack:2:4" "recover:3:2" "hurt:4:2" "dead:5:3"
split_sheet boss 160 160 "walk:0:4" "windup:1:4" "attack:2:4" "recover:3:3" "hurt:4:2" "dead:5:4" "specialAttack:6:5"
