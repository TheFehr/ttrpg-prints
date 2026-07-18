#!/usr/bin/env bash
# Regenerates every file in preview/pregen/ from the real spell_tiles source
# -- run this after any change to spell_tile.scad/spell_tile_plate.scad
# (geometry, letter_size default, letter sets, etc.) that should be
# reflected in the pregenerated plates the browser preview serves directly.
#
# pocket/flush are plain single-body renders (one STL each). inlay needs a
# real two-color .3mf: openscad-nightly's own --export-format=3mf uses a
# <basematerials> resource that Bambu Studio doesn't recognize as multi-
# color (it silently imports geometry-only) -- so instead we render base
# and plug as separate .off meshes and merge them with build3mf.mjs, which
# uses the <m:colorgroup> scheme (3MF Materials Extension) that Bambu
# Studio/OrcaSlicer/PrusaSlicer actually read for per-part filament
# assignment. This is the exact same code path preview.html's live-render
# inlay download uses, so pregen and live downloads never diverge.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PLATE_SCAD=../../spell_tile_plate.scad
# openscad-nightly is snap-confined to $HOME -- a /tmp workdir (mktemp's
# default) is invisible to it.
WORK=$(mktemp -d -p "$HOME")
trap 'rm -rf "$WORK"' EXIT

for lang in english german; do
  letters_block=$(grep -A 13 "^letters_${lang} = " "$PLATE_SCAD")

  for mode in pocket flush; do
    cat > "$WORK/${lang}-${mode}.scad" <<EOF
use <$(realpath "$PLATE_SCAD")>
$letters_block
spell_tile_plate(letters = letters_${lang}, letter_mode = "${mode}");
EOF
    echo "=== ${lang}-${mode}.stl ==="
    openscad-nightly --enable=textmetrics --export-format=binstl \
      -o "${lang}-${mode}.stl" "$WORK/${lang}-${mode}.scad"
  done

  for part in base plug; do
    cat > "$WORK/${lang}-${part}.scad" <<EOF
use <$(realpath "$PLATE_SCAD")>
$letters_block
spell_tile_plate_${part}(letters = letters_${lang});
EOF
    echo "=== ${lang}-${part}.off ==="
    openscad-nightly --enable=textmetrics \
      -o "$WORK/${lang}-${part}.off" "$WORK/${lang}-${part}.scad"
  done

  echo "=== ${lang}-inlay.3mf ==="
  node build3mf.mjs "$WORK/${lang}-base.off" "$WORK/${lang}-plug.off" "${lang}-inlay.3mf"
done

echo "done -- verify with: git status --short ."
