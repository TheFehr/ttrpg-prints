# TTRPG Prints

Parametric OpenSCAD designs for TTRPG-related 3D prints. Built and rendered
with [openscad-nightly](https://openscad.org/) (installed via snap).

**Try it live:** [thefehr.github.io/ttrpg-prints](https://thefehr.github.io/ttrpg-prints/)
— browse designs, customize them, and export an STL/3MF straight from your
browser, no install needed.

Licensed under [MIT](LICENSE).

> **Note:** This repo is built with the help of [Claude](https://claude.com/product/claude-code)
> as an AI coding assistant. Designs are human-directed, but code, CAD
> scripts, and docs may contain AI-generated or AI-edited content.

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
- `spell_tile_plate.scad` — arrays a full letter grid at a configurable pitch
  (22mm by default); `letter_set` is a real Customizer dropdown choosing
  between the official English SPELL letter-frequency list, taken from
  SPELL's own "print at home" PDF (`letters_english`), and an unofficial
  German adaptation of the same approach (`letters_german`, the default —
  16 E's down to single J/Q/X/Y/Z, plus 2 blank tiles marked `?`). Each is
  one newline-joined string (one row per line) rather than an array, so it's
  a real editable Customizer field (a plain string is; an array of strings
  isn't a type OpenSCAD's Customizer recognizes at all) — edit it directly
  in the panel (desktop or [the browser preview](#browser-preview)) to try
  a custom grid without touching the file.

SPELL is a trademark of Whimsy Machine Games; `letters_english` reuses their
published letter distribution so these tiles stay compatible with the real
game, but the tile geometry/mechanism here is original and this project
isn't affiliated with or endorsed by Whimsy Machine Games. See the gallery
for links to buy SPELL and to their own free print-at-home paper tiles.

**Adding a language:** the letter-frequency lists are plain strings and the
plate layout is fully dynamic (`spell_tile_plate.scad` derives its
row/column count from the split grid's own shape, not a hardcoded 10x11),
so a new language doesn't need to match the existing grid size at all:

1. Find or derive a letter-frequency distribution for the language (SPELL's
   own list if it exists for that language, otherwise a general corpus
   frequency table scaled to however many tiles you want, ~100-120 is
   typical). Add it to `spell_tile_plate.scad` as
   `letters_<lang> = "row1\nrow2\n...";` — one row per line, one character
   per tile, `"?"` for a blank/wildcard tile, tagged `[textarea]` so it gets
   a real multi-line editor in both the desktop Customizer and the browser
   preview. Rows can be any length/count; they don't need to match
   `letters_english`/`letters_german`.
2. Add it to `letter_set`'s dropdown options
   (`// [german:...,english:...,<lang>:Label]`) and to the ternary just
   below that picks the active string. That's the only wiring needed — it's
   a real Customizer param now, so the browser preview's form (and its
   `letter_set` dropdown) is generated automatically from the same
   annotation; there's no separate JS to edit.
3. Accented/non-ASCII letters (ä, ö, ü, ß, é, ñ, …) work already — both
   desktop `openscad-nightly` (uses the system's real DejaVu Sans Bold) and
   the browser preview (bundles DejaVu Sans Bold too, verified to cover
   Latin Extended, Greek, and Cyrillic) render them correctly. No font
   changes needed.

## Browser preview

`designs/spell_tiles/preview/preview.html` is a live, in-browser Customizer
for `spell_tiles`, built on
[openscad-customizer-web](https://github.com/TheFehr/openscad-customizer-web)
— a small library shared with a couple of my other design repos. The
control panel isn't hand-built: it's generated straight from
`spell_tile.scad`'s (Single Tile view) or `spell_tile_plate.scad`'s (Full
Plate view) own Customizer comments (`parseCustomizer`/`buildForm`), so a
change to a `.scad` file's annotations — a new slider range, a renamed
field, a new dropdown option — shows up in the browser with no HTML/JS
edit. "View" itself (Single Tile vs. Full Plate) isn't a Customizer field —
it picks which of the two files' forms is active — so it stays a small
hand-built toggle alongside the generated form.

Rendering runs OpenSCAD compiled to WASM in a Web Worker — the library's
*stock* `worker.js`, two instances (one fixed to `spell_tile.scad`, one
fixed to `spell_tile_plate.scad`, so View just picks which one gets
`postMessage`d), fetching the real `.scad` files from `lib/` and
`designs/spell_tiles/` directly (no separate copy to keep in sync). No
project-specific worker *code* needed, though there is one tiny local file,
`preview/worker-shim.js`: `new Worker(url)` requires a same-origin script
(unlike a page's own `<script type="module">`, which can load a
cross-origin module fine via CORS — that restriction is specific to Worker
construction), so it can't point at the jsdelivr URL directly. The shim is
one line — `import 'https://cdn.jsdelivr.net/.../worker.js';` — served
same-origin, whose only job is importing the real worker; that inner
import is a normal cross-origin ES module load, which *is* allowed.

"Inlay" mode needs two separate render passes (base, then plug) since
OpenSCAD's OFF export carries no `color()`, and openscad-customizer-web
supports that declaratively as of 0.2.0 (`multiPass`: a call-pattern regex
and a `{call, color}` per pass — `preview.html`'s `multiPassFor()` is pure
data, not a worker). Full Plate view also needs the text-glyph override
injected into `spell_tile.scad` specifically, even though it's a `use
<...>` *dependency* there, not the render entry point — `textGlyphs.
targetFsPath` (also added in 0.2.0) covers that. Serve the **repo root**
with any static file server and open `/designs/spell_tiles/preview/preview.html`:

```sh
python3 -m http.server 8080
```

Because openscad-wasm ships with no font data at all, letters are rendered
to vector outlines in JavaScript (the library's `text-glyphs.js`:
`opentype.js` + a real webfont) and injected as a `polygon()` that shadows
OpenSCAD's builtin `text()` module — `spell_tile.scad`/`pillow_tile.scad`
themselves are untouched and render identically on the desktop.

**Full-plate renders are slow in the browser:** this WASM build has no
Manifold backend (checked — absent from both `openscad-wasm` and the
actively-maintained `openscad-wasm-prebuilt` fork), so 110-tile boolean ops
fall back to OpenSCAD's old CGAL exact-arithmetic kernel — 1-2 minutes per
pass in a single-threaded Worker that can't report progress mid-pass (the
debug log, `?debug` in the URL, timestamps each stage so a slow render is
distinguishable from a hung one). To sidestep this for the common case,
`designs/spell_tiles/preview/pregen/` has the 6 "expected" full plates (2
letter sets x 3 modes, at `spell_tile_plate.scad`'s own default letter
size/depth/font/pitch) pre-rendered offline with real desktop
`openscad-nightly` (has Manifold, seconds not minutes); when the current
form values match a preset exactly — including the letter-grid textarea
being unedited — the preview loads that file directly and skips the WASM
worker entirely. Anything else (a hand-edited grid, custom size/depth/pitch,
single-tile view) still goes through the live WASM render.

**Inlay downloads are a single `.3mf`, not two STLs.** Base and plug are
merged into one file with per-triangle color (the library's
`buildMultiColor3mf()`/`downloadMultiColor3mf()`), so it's one
correctly-aligned, two-color file instead of two STLs the user would
otherwise have to reposition by hand in the slicer. This uses the 3MF
*Materials and Properties Extension*'s `<m:colorgroup>`/`<m:color>` (pid/p1
pointing at a colorgroup resource) — Bambu Studio, OrcaSlicer, and
PrusaSlicer all read this for per-part filament assignment. Plain OpenSCAD
`--export-format=3mf` instead emits a `<basematerials>` resource (correct
per the core 3MF spec, but *not* something Bambu Studio treats as
multi-color data — it silently falls back to "not from Bambu Lab, load
geometry data only" and imports one flat, uncolored object), so it isn't
used for inlay output anywhere: the live browser render builds the
colorgroup `.3mf` client-side, and the pregen inlay files are built by the
same library logic offline (`preview/pregen/build3mf.mjs`, driven by
`preview/pregen/generate.sh` — run that script after any change to the tile
geometry, letter sets, or letter size that should be reflected in the
pregenerated plates).

Render:

```sh
openscad-nightly --enable=textmetrics -o spell_tile.stl designs/spell_tiles/spell_tile.scad
openscad-nightly --enable=textmetrics -o spell_tile_plate.stl designs/spell_tiles/spell_tile_plate.scad
# -D overrides any Customizer param by name, e.g. the English list instead
# of the default German one:
openscad-nightly --enable=textmetrics -D 'letter_set="english"' \
  -o spell_tile_plate_english.stl designs/spell_tiles/spell_tile_plate.scad
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
