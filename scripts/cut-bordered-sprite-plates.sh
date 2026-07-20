#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  printf 'usage: %s <bordered-plate.png> <output-dir>\n' "$0" >&2
  exit 2
fi

plate="$1"
output_dir="$2"
mkdir -p "$output_dir"
base="${plate%.png}"
json="${base}.json"
[[ -f "$plate" ]] || { printf 'missing plate: %s\n' "$plate" >&2; exit 1; }
[[ -f "$json" ]] || { printf 'missing plate metadata: %s\n' "$json" >&2; exit 1; }

mapfile -t labels < <(sed -n 's/.*"label": "\([^"]*\)".*/\1/p' "$json")
card_width="$(sed -n 's/.*"cardWidth": \([0-9][0-9]*\).*/\1/p' "$json")"
card_height="$(sed -n 's/.*"cardHeight": \([0-9][0-9]*\).*/\1/p' "$json")"
card_geometry="${card_width}x${card_height}"

# The border is the only exact #ff4fd8 color in the plate. Connected-component
# detection finds each closed rectangle even when cards are rearranged later.
mapfile -t boxes < <(
  convert "$plate" \
    -fill black +opaque '#ff4fd8' \
    -fill white -opaque '#ff4fd8' \
    -define connected-components:verbose=true \
    -connected-components 8 null: |
    sed -n 's/^[[:space:]]*[0-9]*: \([0-9][0-9]*x[0-9][0-9]*+[0-9][0-9]*+[0-9][0-9]*\) .*/\1/p' |
    grep "^${card_geometry}+" |
    sort -t+ -k3,3n -k2,2n
)

[[ ${#boxes[@]} -eq ${#labels[@]} ]] || {
  printf 'border count (%d) does not match metadata (%d)\n' "${#boxes[@]}" "${#labels[@]}" >&2
  exit 1
}

for ((index = 0; index < ${#boxes[@]}; index += 1)); do
  label="${labels[$index]}"
  geometry="${boxes[$index]}"
  # Remove only the border; retain the complete padded card interior.
  convert "$plate" -crop "$geometry" +repage -shave 4x4 +repage \
    "$output_dir/$label.png"
done

printf 'cut %d bordered frames -> %s\n' "${#boxes[@]}" "$output_dir"
