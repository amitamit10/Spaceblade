#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$root/public/assets/public/warped-city"
frame_dir="$root/public/sprites/frames"

normalize_frame() {
  local source="$1" output="$2" width="$3" height="$4" scale_percent="$5"
  mkdir -p "$(dirname "$output")"
  convert "$source" \
    -filter point -resize "${scale_percent}%" \
    -background none -gravity south -extent "${width}x${height}" \
    "$output"
}

write_sequence() {
  local actor="$1" action="$2" width="$3" height="$4" scale_percent="$5" source_glob="$6"
  shift 6
  local sources=("$@")
  local index=0
  for source in "${sources[@]}"; do
    normalize_frame "$source_dir/$source" \
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
drone_source() { printf 'enemies/drone-%s.png' "$1"; }
turret_source() { printf 'enemies/turret-%s.png' "$1"; }
explosion_source() { printf 'effects/enemy-explosion-%s.png' "$1"; }

player_walk=()
for index in 1 2 3 4 5 6; do player_walk+=("$(player_source "walk-$index.png")"); done
player_idle=()
for index in 1 2 3 4; do player_idle+=("$(player_source "idle-$index.png")"); done
player_run=()
for index in 1 2 3 4 5 6 7 8; do player_run+=("$(player_source "run-$index.png")"); done
player_run_shoot=()
for index in 1 2 3 4 5 6 7 8; do player_run_shoot+=("$(player_source "run-shoot-$index.png")"); done

write_sequence player idle 96 96 100 "" "${player_idle[@]}"
write_sequence player walk 96 96 100 "" "${player_walk[@]}"
write_sequence player slash 96 96 100 "" "${player_run[0]}" "${player_run[1]}" "${player_run[2]}" "${player_run[3]}"
repeat_sources player charge 96 96 100 3 "$(player_source shoot.png)"
write_sequence player heavy 96 96 100 "" "${player_run_shoot[0]}" "${player_run_shoot[1]}" "${player_run_shoot[2]}" "${player_run_shoot[3]}" "${player_run_shoot[4]}" "${player_run_shoot[5]}"
write_sequence player dodge 96 96 100 "" "${player_run[0]}" "${player_run[2]}" "${player_run[4]}"
repeat_sources player parry 96 96 100 2 "$(player_source shoot.png)"
repeat_sources player hurt 96 96 100 2 "$(player_source hurt.png)"
repeat_sources player dead 96 96 100 2 "$(player_source hurt.png)"

drone_walk=()
for index in 1 2 3 4; do drone_walk+=("$(drone_source "$index")"); done
drone_explosion=()
for index in 1 2 3; do drone_explosion+=("$(explosion_source "$index")"); done

for actor in grunt runner glitch; do
  width=64; height=64; scale=100
  [[ "$actor" == glitch ]] && width=80 && height=80 && scale=130
  write_sequence "$actor" walk "$width" "$height" "$scale" "" "${drone_walk[@]}"
  write_sequence "$actor" windup "$width" "$height" "$scale" "" "${drone_walk[1]}" "${drone_walk[2]}"
  write_sequence "$actor" attack "$width" "$height" "$scale" "" "${drone_walk[1]}" "${drone_walk[2]}" "${drone_walk[3]}"
  write_sequence "$actor" recover "$width" "$height" "$scale" "" "${drone_walk[2]}" "${drone_walk[3]}"
  repeat_sources "$actor" hurt "$width" "$height" "$scale" 2 "${drone_walk[0]}"
  write_sequence "$actor" dead "$width" "$height" "$scale" "" "${drone_explosion[@]}"
done

turret_frames=()
for index in 1 2 3 4 5 6; do turret_frames+=("$(turret_source "$index")"); done
for actor in shield tank boss; do
  width=80; height=80; scale=240
  [[ "$actor" == tank ]] && width=96 && height=96 && scale=320
  [[ "$actor" == boss ]] && width=160 && height=160 && scale=600
  write_sequence "$actor" walk "$width" "$height" "$scale" "" "${turret_frames[0]}" "${turret_frames[1]}" "${turret_frames[2]}" "${turret_frames[3]}"
  write_sequence "$actor" windup "$width" "$height" "$scale" "" "${turret_frames[1]}" "${turret_frames[2]}" "${turret_frames[3]}"
  write_sequence "$actor" attack "$width" "$height" "$scale" "" "${turret_frames[2]}" "${turret_frames[3]}" "${turret_frames[4]}"
  write_sequence "$actor" recover "$width" "$height" "$scale" "" "${turret_frames[4]}" "${turret_frames[5]}"
  repeat_sources "$actor" hurt "$width" "$height" "$scale" 2 "${turret_frames[1]}"
  write_sequence "$actor" dead "$width" "$height" "$scale" "" "${drone_explosion[@]}"
done

printf 'public runtime frames generated under %s\n' "$frame_dir"
