#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$root/public/assets/public/warped-city"
robot_source_dir="$root/public/assets/public/kenney-robot-pack/PNG/Side view"
frame_dir="$root/public/sprites/frames"

# The manifest renamed this loop to `charge`; remove the old generated name so
# stale files cannot be mistaken for active runtime frames.
rm -f "$frame_dir/player"/charging-*.png

normalize_frame() {
  local source="$1" output="$2" width="$3" height="$4" scale_percent="$5"
  mkdir -p "$(dirname "$output")"
  convert "$source" \
    -filter point -resize "${scale_percent}%" \
    -background none -gravity south -extent "${width}x${height}" \
    -depth 8 -define png:color-type=6 \
    "$output"
}

write_sequence() {
  local actor="$1" action="$2" width="$3" height="$4" scale_percent="$5" source_glob="$6"
  shift 6
  local sources=("$@")
  local index=0
  for source in "${sources[@]}"; do
    local source_path="$source"
    [[ "$source_path" != /* ]] && source_path="$source_dir/$source_path"
    normalize_frame "$source_path" \
      "$frame_dir/$actor/$action-$(printf '%02d' "$index").png" \
      "$width" "$height" "$scale_percent"
    index=$((index + 1))
  done
}

repeat_sources() {
  local actor="$1" action="$2" width="$3" height="$4" scale_percent="$5" count="$6" source="$7"
  local sources=()
  for ((index = 0; index < count; index += 1)); do sources+=("$source"); done
  write_sequence "$actor" "$action" "$width" "$height" "$scale_percent" "" "${sources[@]}"
}

player_source() { printf 'player/%s' "$1"; }
explosion_source() { printf 'effects/enemy-explosion-%s.png' "$1"; }
robot_source() { printf '%s/robot_%s%s.png' "$robot_source_dir" "$1" "$2"; }

player_walk=()
for index in 1 2 3 4 5 6; do player_walk+=("$(player_source "walk-$index.png")"); done
player_idle=()
for index in 1 2 3 4; do player_idle+=("$(player_source "idle-$index.png")"); done
player_run=()
for index in 1 2 3 4 5 6 7 8; do player_run+=("$(player_source "run-$index.png")"); done
player_run_shoot=()
for index in 1 2 3 4 5 6 7 8; do player_run_shoot+=("$(player_source "run-shoot-$index.png")"); done

write_sequence player idle 96 96 100 "" "${player_idle[@]}"
write_sequence player run 96 96 100 "" "${player_run[@]}"
write_sequence player walk 96 96 100 "" "${player_walk[@]}"
write_sequence player slash 96 96 100 "" "${player_run[0]}" "${player_run[1]}" "${player_run[2]}" "${player_run[3]}"
repeat_sources player charge 96 96 100 3 "$(player_source shoot.png)"
write_sequence player heavy 96 96 100 "" "${player_run_shoot[0]}" "${player_run_shoot[1]}" "${player_run_shoot[2]}" "${player_run_shoot[3]}" "${player_run_shoot[4]}" "${player_run_shoot[5]}"
write_sequence player dodge 96 96 100 "" "${player_run[0]}" "${player_run[2]}" "${player_run[4]}"
repeat_sources player parry 96 96 100 2 "$(player_source shoot.png)"
repeat_sources player hurt 96 96 100 2 "$(player_source hurt.png)"
repeat_sources player dead 96 96 100 2 "$(player_source hurt.png)"

drone_explosion=()
for index in 1 2 3; do drone_explosion+=("$(explosion_source "$index")"); done

write_robot_actor() {
  local actor="$1" color="$2" width="$3" height="$4" scale="$5"
  local drive1 drive2 jump damage1 damage2 hurt
  drive1="$(robot_source "$color" Drive1)"
  drive2="$(robot_source "$color" Drive2)"
  jump="$(robot_source "$color" Jump)"
  damage1="$(robot_source "$color" Damage1)"
  damage2="$(robot_source "$color" Damage2)"
  hurt="$(robot_source "$color" Hurt)"

  write_sequence "$actor" walk "$width" "$height" "$scale" "" "$drive1" "$drive2" "$drive1" "$drive2"
  write_sequence "$actor" windup "$width" "$height" "$scale" "" "$jump" "$drive2"
  write_sequence "$actor" attack "$width" "$height" "$scale" "" "$damage1" "$damage2" "$damage1"
  write_sequence "$actor" recover "$width" "$height" "$scale" "" "$drive2" "$drive1"
  write_sequence "$actor" hurt "$width" "$height" "$scale" "" "$hurt" "$damage1"
  write_sequence "$actor" dead "$width" "$height" "$scale" "" "${drone_explosion[@]}"
}

# These profiles deliberately use distinct online source variants and sizes;
# no authored Spaceblade enemy sheet is part of the shipped runtime anymore.
write_robot_actor grunt blue 64 64 40
write_robot_actor runner red 64 64 38
write_robot_actor shield green 80 80 48
write_robot_actor tank yellow 96 96 58
write_robot_actor glitch blue 80 80 52
write_robot_actor boss red 160 160 82

printf 'public runtime frames generated under %s\n' "$frame_dir"
