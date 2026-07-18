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

**Two-body original vs. this single-body version:** in the original CAD,
each tile's letter is a *separate* solid — a 2mm-deep plug that sits exactly
flush in a matching pocket cut into the base, clearly meant for a filament
swap / dual-color print (flush letters aren't visible at all in a single
color). `spell_tile.scad` instead raises the letter 0.6mm above the surface
(embedded 1.4mm for adhesion) so it reads in a single material. The base
module still has `icon_pocket()` if you want to reproduce the original's
flush two-part inlay approach for multi-color printing.

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
