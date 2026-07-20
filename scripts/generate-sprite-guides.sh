#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$root/public/sprites"
output_dir="$root/mockups/sprite-guides"
mkdir -p "$output_dir"

# Each entry is: id frame_width frame_height columns rows row_name:frame_count...
sheet_specs=(
  "player 96 96 6 9 idle:4 walk:6 slash:4 charge:3 heavy:6 dodge:3 parry:2 hurt:2 dead:2"
  "grunt 64 64 4 6 walk:4 windup:3 attack:3 recover:2 hurt:2 dead:3"
  "runner 64 64 6 6 walk:6 windup:3 attack:4 recover:2 hurt:2 dead:3"
  "shield 80 80 4 6 walk:4 windup:3 attack:3 recover:2 hurt:2 dead:3"
  "tank 96 96 4 6 walk:4 windup:4 attack:4 recover:2 hurt:2 dead:3"
  "glitch 80 80 6 6 walk:6 windup:3 attack:4 recover:2 hurt:2 dead:3"
  "boss 160 160 5 7 walk:4 windup:4 attack:4 recover:3 hurt:2 dead:4 specialAttack:5"
)

row_padding() {
  case "$1" in
    slash|heavy|dodge|parry|specialAttack) echo 18 ;;
    attack|windup) echo 14 ;;
    dead) echo 16 ;;
    *) echo 8 ;;
  esac
}

draw_frame_box() {
  local source="$1" output="$2" frame_width="$3" frame_height="$4" row="$5" col="$6" action="$7"
  local cell_x=$((col * frame_width))
  local cell_y=$((row * frame_height))
  local geometry
  geometry="$(convert "$source" -crop "${frame_width}x${frame_height}+${cell_x}+${cell_y}" -trim -format '%@' info:)"
  [[ "$geometry" == 0x0+0+0 ]] && return 0

  local bounds_width bounds_height bounds_x bounds_y padding
  bounds_width="${geometry%%x*}"
  local rest="${geometry#*x}"
  bounds_height="${rest%%+*}"
  rest="${rest#*+}"
  bounds_x="${rest%%+*}"
  bounds_y="${rest#*+}"
  padding="$(row_padding "$action")"

  local left=$((cell_x + bounds_x - padding))
  local top=$((cell_y + bounds_y - padding))
  local right=$((cell_x + bounds_x + bounds_width + padding))
  local bottom=$((cell_y + bounds_y + bounds_height + padding))
  left=$((left < 0 ? 0 : left))
  top=$((top < 0 ? 0 : top))
  right=$((right > frame_width * columns ? frame_width * columns : right))
  bottom=$((bottom > frame_height * rows ? frame_height * rows : bottom))

  local color="#ff4fd8"
  [[ "$action" == "walk" || "$action" == "idle" ]] && color="#47e8ff"
  convert "$output" -stroke "$color" -strokewidth "$((frame_width >= 128 ? 3 : 2))" -fill none \
    -draw "rectangle $left,$top $right,$bottom" "$output"
}

for spec in "${sheet_specs[@]}"; do
  read -r id frame_width frame_height columns rows row_specs <<< "$spec"
  source="$source_dir/$id.png"
  output="$output_dir/$id-guide.png"
  [[ -f "$source" ]] || { printf 'missing source: %s\n' "$source" >&2; exit 1; }

  convert "$source" -background "#071322" -alpha background \
    -stroke "#24455b" -strokewidth 1 -fill none \
    -draw "$(
      for ((col = 0; col <= columns; col += 1)); do
        printf 'line %s,0 %s,%s ' "$((col * frame_width))" "$((col * frame_width))" "$((rows * frame_height))"
      done
      for ((row = 0; row <= rows; row += 1)); do
        printf 'line 0,%s %s,%s ' "$((row * frame_height))" "$((columns * frame_width))" "$((row * frame_height))"
      done
    )" "$output"

  row=0
  for row_spec in $row_specs; do
    action="${row_spec%%:*}"
    frame_count="${row_spec#*:}"
    for ((col = 0; col < frame_count; col += 1)); do
      draw_frame_box "$source" "$output" "$frame_width" "$frame_height" "$row" "$col" "$action"
    done
    row=$((row + 1))
  done
  printf '%s -> %s\n' "$id" "$output"
done
