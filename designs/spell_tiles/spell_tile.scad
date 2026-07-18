// spell_tile.scad
//
// A single parameterized letter tile: pillow-edge base + one large raised
// letter, like a Bananagrams/Scrabble-style word-tile for spellcasting.
// Open this file directly in OpenSCAD to drive it from the Customizer, or
// `use <spell_tile.scad>` from another file to place many with different
// letters (see spell_tile_plate.scad).
//
// Geometry reverse engineered from SpellTiles.stl: 20x20x4mm tiles, ~6mm
// corner radius, a 1.5mm sphere-bevel top/bottom edge, 1mm flat core,
// arranged on a 22mm grid, with a single letter embossed 2mm deep (flush
// with the top of the pillow bevel) on each tile.

include <../../lib/pillow_tile.scad>

/* [Tile] */
size = 20;
thickness = 4;
corner_r = 6;
bevel_r = 1.5;

/* [Letter] */
letter = "A";
letter_size = 13;
letter_boss_height = 2;
letter_font = "DejaVu Sans:style=Bold";

/* [Render] */
$fn = 48;

module spell_tile(size = size, thickness = thickness, corner_r = corner_r,
                   bevel_r = bevel_r, letter = letter, letter_size = letter_size,
                   letter_boss_height = letter_boss_height, letter_font = letter_font) {
    union() {
        pillow_tile(size, thickness, corner_r, bevel_r);

        if (letter != "" && letter != "?")
            icon_boss(thickness, letter_boss_height)
                text(letter, size = letter_size, halign = "center",
                     valign = "center", font = letter_font);
    }
}

spell_tile();
