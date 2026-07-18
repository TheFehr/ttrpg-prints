// spell_tile.scad
//
// A single parameterized letter tile: chamfered-octagon base + one large
// raised letter, like a Bananagrams/Scrabble-style word-tile for
// spellcasting. Open this file directly in OpenSCAD to drive it from the
// Customizer, or `use <spell_tile.scad>` from another file to place many
// with different letters (see spell_tile_plate.scad).
//
// Geometry reverse engineered exactly from the original Fusion 360 model
// (SpellTiles.step): 20x20x4mm tiles, chamfered-square (octagon) footprint,
// a flat two-stage chamfer edge (not a round bevel -- every face in the
// original is planar), arranged on a 22mm grid, with a single letter 2mm
// deep, flush with the tile's flat top land.

include <../../lib/pillow_tile.scad>

/* [Tile] */
thickness = 4;
bevel_h = 1.5;
a_mid = 10.0;
c_mid = 5.921;
a_end = 9.478;
c_end = 5.552;

/* [Letter] */
letter = "A";
letter_size = 13;
letter_embed = 1.4;
letter_rise = 0.6;
letter_font = "DejaVu Sans:style=Bold";

module spell_tile(thickness = thickness, bevel_h = bevel_h,
                   a_mid = a_mid, c_mid = c_mid, a_end = a_end, c_end = c_end,
                   letter = letter, letter_size = letter_size,
                   letter_embed = letter_embed, letter_rise = letter_rise,
                   letter_font = letter_font) {
    union() {
        pillow_tile(thickness, bevel_h, a_mid, c_mid, a_end, c_end);

        if (letter != "" && letter != "?")
            icon_boss(thickness, letter_embed, letter_rise)
                text(letter, size = letter_size, halign = "center",
                     valign = "center", font = letter_font);
    }
}

spell_tile();
