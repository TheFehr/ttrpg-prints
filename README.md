# ttrpg_prints

> **Note:** This repo is built with the help of [Claude](https://claude.com/product/claude-code)
> as an AI coding assistant. Designs are human-directed, but code, CAD
> scripts, and docs may contain AI-generated or AI-edited content.

Parametric OpenSCAD designs for TTRPG-related 3D prints. Built and rendered
with [openscad-nightly](https://openscad.org/) (installed via snap).

## Layout

```
lib/                          shared reusable OpenSCAD modules
designs/<name>/                one folder per design
  reference/                   original source file(s) a design was reverse engineered from, if any
  preview/                     browser-based live Customizer for this design, if any
index.html                     top-level gallery linking to every design's preview
```

## Designs

### spell_tiles

`designs/spell_tiles/` — a set of 20x20x4mm letter tiles (like a
Bananagrams/Scrabble-style word-tile set for spellcasting), reverse
engineered exactly from the original Fusion 360 model
(`reference/SpellTiles_original.step`), read via OpenCascade (`cadquery`)
rather than approximated from the triangulated STL — every face in the
original is a flat plane, so the geometry is exact, not estimated:

- footprint: a chamfered square (an 8-sided but *not* regular octagon — 4
  axis-aligned flat sides + 4 diagonal 45° corner chamfers)
- 4mm thick, in three flat-faceted stages (no curves anywhere in the
  original): 1.5mm chamfer down, a 1mm flat core, 1.5mm chamfer back up.
  Flat core is the widest cross-section (apothem 10.0mm, corner chamfer leg
  5.921mm); top/bottom faces are smaller (apothem 9.478mm, chamfer leg
  5.552mm)
- tiles arranged on a 22mm grid (2mm gap) in the original 10x11 plate

The original plate has 109 unique hand-drawn icons that can't be recovered
from a mesh — but they turned out to actually be single letters, so
`spell_tile.scad` reproduces the base geometry exactly and uses OpenSCAD's
`text()` for the letter, fully parametric (letter, size, font, tile
dimensions).

**These tiles get drawn blind out of a bag, so the letter must not be
identifiable by touch — no raised boss.** In the original CAD, each tile's
letter is a *separate* solid: a 2mm-deep plug that sits exactly flush in a
matching pocket cut into the base, clearly meant for a filament swap /
dual-color print. `letter_mode` on `spell_tile()` controls how that's
realized here:

- `"pocket"` (default) — letter engraved as a shallow recess only, no fill.
  Single body, single material. A recess is far less detectable by touch
  than any protrusion, so this is the safe default for blind draw.
- `"inlay"` — base-with-pocket and a separate flush plug, shown in two
  `color()`s (visualization only, doesn't change geometry) for a
  multi-material printer (AMS/IDEX) or a hand-painted insert. Fully flush
  either way — the two-color version is exactly the original's design.
- `"flush"` — base and plug fused into one solid with no visible cut at all.

`spell_tile_plate.scad` mirrors this: `spell_tile_plate()` (single plate,
`letter_mode="pocket"` by default) for a one-material blind-safe print, or
`spell_tile_plate_base()` / `spell_tile_plate_plug()` separately for a
two-color print (plugs are positioned to match their base exactly).

Files:
- `spell_tile.scad` — single tile, open directly in OpenSCAD for the Customizer
- `spell_tile_plate.scad` — arrays a full letter grid at 22mm pitch; includes
  the official English SPELL letter-frequency list, taken from SPELL's own
  "print at home" PDF (`letters_english`), and an unofficial German
  adaptation of the same approach (`letters_german`, the active default —
  16 E's down to single J/Q/X/Y/Z, plus 2 blank tiles marked `?`)

**Adding a language:** the letter-frequency lists are just OpenSCAD arrays,
and the plate layout is fully dynamic (`spell_tile_plate.scad` derives its
row/column count from the array's own shape, not a hardcoded 10x11), so a
new language doesn't need to match the existing grid size at all:

1. Find or derive a letter-frequency distribution for the language (SPELL's
   own list if it exists for that language, otherwise a general corpus
   frequency table scaled to however many tiles you want, ~100-120 is
   typical). Add it to `spell_tile_plate.scad` as `letters_<lang> = [...]`
   — one string per row, one character per tile, `"?"` for a blank/wildcard
   tile. Rows can be any length/count; they don't need to match
   `letters_english`/`letters_german`.
2. Optionally set `letters = letters_<lang>;` if you want it as the default
   for a plain `openscad -o out.stl spell_tile_plate.scad` render.
3. To make it selectable in the browser preview
   (`designs/spell_tiles/preview/preview.html`),
   add one `<option value="letters_<lang>">Label</option>` to the "Letter
   set" dropdown — nothing else to change, `preview-worker.js` parses
   *any* `letters_\w+ = [...]` array out of the plate file automatically.
4. Accented/non-ASCII letters (ä, ö, ü, ß, é, ñ, …) work already — both
   desktop `openscad-nightly` (uses the system's real DejaVu Sans Bold) and
   the browser preview (bundles DejaVu Sans Bold too, verified to cover
   Latin Extended, Greek, and Cyrillic) render them correctly. No font
   changes needed.

## Browser preview

`designs/spell_tiles/preview/preview.html` + `preview-worker.js` is a live,
in-browser Customizer for `spell_tiles` — set the letter (or full plate +
letter set) and mode, see it render and rotate, download an STL. It runs
OpenSCAD compiled to WASM in a Web Worker, fetching the real `.scad` files
from `lib/` and `designs/spell_tiles/` directly (no separate copy to keep in
sync). Serve the **repo root** with any static file server and open
`/designs/spell_tiles/preview/preview.html`:

```sh
python3 -m http.server 8080
```

Because openscad-wasm ships with no font data at all, letters are rendered
to vector outlines in JavaScript (`opentype.js` + a real webfont) and
injected as a `polygon()` that shadows OpenSCAD's builtin `text()` module —
`spell_tile.scad`/`pillow_tile.scad` themselves are untouched and render
identically on the desktop.

**Full-plate renders are slow in the browser:** this WASM build has no
Manifold backend (checked — absent from both `openscad-wasm` and the
actively-maintained `openscad-wasm-prebuilt` fork), so 110-tile boolean ops
fall back to OpenSCAD's old CGAL exact-arithmetic kernel — 1-2 minutes per
pass in a single-threaded Worker that can't report progress mid-pass (the
debug log, `?debug` in the URL, timestamps each stage so a slow render is
distinguishable from a hung one). To sidestep this for the common case,
`designs/spell_tiles/preview/pregen/` has the 6 "expected" full plates (2 letter sets x 3 modes,
at the default letter size/depth) pre-rendered offline with real desktop
`openscad-nightly` (has Manifold, seconds not minutes); when the current
settings match one exactly, the preview loads that file directly and skips
the WASM worker entirely. Anything else (custom size/depth, single-tile
view) still goes through the live WASM render.

**Inlay downloads are a single `.3mf`, not two STLs.** Base and plug are
merged into one file with per-triangle color, so it's one correctly-aligned,
two-color file instead of two STLs the user would otherwise have to
reposition by hand in the slicer. This uses the 3MF *Materials and
Properties Extension*'s `<m:colorgroup>`/`<m:color>` (pid/p1 pointing at a
colorgroup resource) — Bambu Studio, OrcaSlicer, and PrusaSlicer all read
this for per-part filament assignment. Plain OpenSCAD `--export-format=3mf`
instead emits a `<basematerials>` resource (correct per the core 3MF spec,
but *not* something Bambu Studio treats as multi-color data — it silently
falls back to "not from Bambu Lab, load geometry data only" and imports one
flat, uncolored object), so it isn't used for inlay output anywhere: the
live browser render builds the colorgroup `.3mf` client-side
(`buildInlay3mf()` in `preview.html`), and the pregen inlay files are built
by the same logic offline (`preview/pregen/build3mf.mjs`, driven by
`preview/pregen/generate.sh` — run that script after any change to the tile
geometry, letter sets, or letter size that should be reflected in the
pregenerated plates).

Render:

```sh
openscad-nightly --enable=textmetrics -o spell_tile.stl designs/spell_tiles/spell_tile.scad
openscad-nightly --enable=textmetrics -o spell_tile_plate.stl designs/spell_tiles/spell_tile_plate.scad
```

Note: openscad-nightly is snap-confined and can only read/write inside
`$HOME` — point `-o` somewhere under your home directory, not `/tmp`. Add
`--export-format=binstl` for a much smaller binary STL (OpenSCAD defaults to
ASCII STL, which is ~6x larger for no benefit).

`--enable=textmetrics` (or, in the GUI, ticking `textmetrics` under Edit >
Preferences > Features) is needed for the letter to be truly centered on the
tile: OpenSCAD's own `text(halign="center")` centers on the glyph's
*advance* box, not its visible ink, so without this most letters render
measurably (up to ~1mm on a 20mm tile) off-center. `spell_tile.scad`'s
`centered_text()` uses `textmetrics()` to correct for this; if the feature
isn't enabled, `textmetrics()` quietly returns `undef` and it falls back to
plain (slightly off-center) `text()` — nothing breaks, it just regresses to
that offset.

The full 110-tile plate renders in a few seconds, but for actual printing
it's usually easier to slice `spell_tile_plate.stl` directly (it's already
arranged and watertight) rather than duplicating individual tiles in your
slicer.

Note also: `spell_tile_plate.scad`'s fast F5 preview shows raw unioned
geometry with the boolean letter/base union *not yet applied* — use F6
(render) or export to actually see the letters.
