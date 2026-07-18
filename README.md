# ttrpg_prints

Parametric OpenSCAD designs for TTRPG-related 3D prints. Built and rendered
with [openscad-nightly](https://openscad.org/) (installed via snap).

## Layout

```
lib/                          shared reusable OpenSCAD modules
designs/<name>/                one folder per design
  reference/                   original source file(s) a design was reverse engineered from, if any
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
  both the reconstructed original letter distribution (`letters_original`)
  and a word-game-style frequency set (`letters_today`, the active default —
  16 E's down to single J/Q/X/Y/Z, plus 2 blank tiles marked `?`)

Render:

```sh
openscad-nightly -o spell_tile.stl designs/spell_tiles/spell_tile.scad
openscad-nightly -o spell_tile_plate.stl designs/spell_tiles/spell_tile_plate.scad
```

Note: openscad-nightly is snap-confined and can only read/write inside
`$HOME` — point `-o` somewhere under your home directory, not `/tmp`. Add
`--export-format=binstl` for a much smaller binary STL (OpenSCAD defaults to
ASCII STL, which is ~6x larger for no benefit).

The full 110-tile plate renders in a few seconds, but for actual printing
it's usually easier to slice `spell_tile_plate.stl` directly (it's already
arranged and watertight) rather than duplicating individual tiles in your
slicer.

Note also: `spell_tile_plate.scad`'s fast F5 preview shows raw unioned
geometry with the boolean letter/base union *not yet applied* — use F6
(render) or export to actually see the letters.
