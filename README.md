# ttrpg_prints

Parametric OpenSCAD designs for TTRPG-related 3D prints. Built and rendered
with [openscad-nightly](https://openscad.org/) (installed via snap).

## Layout

```
lib/                          shared reusable OpenSCAD modules
designs/<name>/                one folder per design
  reference/                   original STL(s) a design was reverse engineered from, if any
```

## Designs

### spell_tiles

`designs/spell_tiles/` — a set of 20x20x4mm "pillow edge" letter tiles
(rounded-square base, smooth sphere-bevel top/bottom edge, one large raised
letter per tile), reverse engineered from `reference/SpellTiles_original.stl`
by slicing the mesh at many Z heights to recover its dimensions:

- 20x20mm footprint, ~6mm corner radius
- 4mm thick: 1.5mm sphere-bevel edge on top and bottom, 1mm flat core
- letter embossed 2mm, flush with the top of the bevel
- tiles arranged on a 22mm grid (2mm gap) in the original 10x11 plate

The original plate has 109 unique hand-drawn icons that can't be recovered
from a triangle mesh — but they turned out to actually be single letters
(a word-tile / rune-tile set for spellcasting), so `spell_tile.scad`
reproduces the base geometry faithfully and uses OpenSCAD's `text()` for the
letter, fully parametric (letter, size, font, tile dimensions).

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
`$HOME` — point `-o` somewhere under your home directory, not `/tmp`.

The full 110-tile plate renders in a few seconds with the Manifold backend,
but for actual printing it's usually easier to slice `spell_tile_plate.stl`
directly (it's already arranged and watertight) rather than duplicating
individual tiles in your slicer.
