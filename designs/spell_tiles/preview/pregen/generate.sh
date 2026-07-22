#!/usr/bin/env bash
# Regenerates every file in preview/pregen/ from the real spell_tiles source
# -- run this after any change to spell_tile.scad/spell_tile_plate.scad
# (geometry, letter_size default, letter sets, etc.) that should be
# reflected in the pregenerated plates the browser preview serves directly.
#
# letter_set is a real top-level Customizer param on spell_tile_plate.scad
# now, so selecting a language is just `-D letter_set="..."` -- no more
# grep-extracting the letters_<lang> literal into a wrapper file.
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

PLATE_SCAD=$(realpath ../../spell_tile_plate.scad)
# openscad-nightly is snap-confined to $HOME -- a /tmp workdir is invisible
# to it.
WORK=$(mktemp -d -p "$HOME")
trap 'rm -rf "$WORK"' EXIT

for lang in english german; do
  for mode in pocket flush; do
    echo "=== ${lang}-${mode}.stl ==="
    openscad-nightly --enable=textmetrics -D "letter_set=\"${lang}\"" -D "letter_mode=\"${mode}\"" \
      --export-format=binstl -o "${lang}-${mode}.stl" "$PLATE_SCAD"
  done

  for part in base plug; do
    echo "=== ${lang}-${part}.off ==="
    cat > "$WORK/${lang}-${part}.scad" <<EOF
use <${PLATE_SCAD}>
spell_tile_plate_${part}();
EOF
    openscad-nightly --enable=textmetrics -D "letter_set=\"${lang}\"" \
      -o "$WORK/${lang}-${part}.off" "$WORK/${lang}-${part}.scad"
  done

  echo "=== ${lang}-inlay.3mf ==="
  node build3mf.mjs "$WORK/${lang}-base.off" "$WORK/${lang}-plug.off" "${lang}-inlay.3mf"
done

echo "done -- verify with: git status --short ."
