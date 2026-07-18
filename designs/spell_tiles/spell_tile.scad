// spell_tile.scad
//
// A single parameterized letter tile: chamfered-octagon base + one large
// letter, like a Bananagrams/Scrabble-style word-tile for spellcasting.
// Open this file directly in OpenSCAD to drive it from the Customizer, or
// `use <spell_tile.scad>` from another file to place many with different
// letters (see spell_tile_plate.scad).
//
// Geometry reverse engineered exactly from the original Fusion 360 model
// (SpellTiles.step): 20x20x4mm tiles, chamfered-square (octagon) footprint,
// a flat two-stage chamfer edge (not a round bevel -- every face in the
// original is planar), arranged on a 22mm grid.
//
// These tiles get drawn blind out of a bag, so the letter must NOT be
// detectable by touch -- no raised boss. `letter_mode` controls how the
// letter is realized:
//   "pocket" (default) -- letter engraved as a shallow recess only, no fill.
//       Single body, single material, safe for blind draw. Least tactile
//       option: a recess reads far less by touch than any protrusion.
//   "inlay"  -- base-with-pocket and a separate flush plug, shown in two
//       colors (color() only, doesn't affect geometry) for a multi-material
//       printer (AMS/IDEX) or hand-painted insert. Fully flush either way.
//   "flush"  -- base+plug fused into one solid body with no visible cut,
//       useful if you don't need the letter distinguishable at all yet.

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
letter_depth = 1.2;
letter_font = "DejaVu Sans:style=Bold";
letter_mode = "pocket"; // "pocket", "inlay", "flush"

module spell_tile_base(thickness = thickness, bevel_h = bevel_h,
                        a_mid = a_mid, c_mid = c_mid, a_end = a_end, c_end = c_end,
                        letter = letter, letter_size = letter_size,
                        letter_depth = letter_depth, letter_font = letter_font) {
    difference() {
        pillow_tile(thickness, bevel_h, a_mid, c_mid, a_end, c_end);
        if (letter != "" && letter != "?")
            icon_pocket(thickness, letter_depth)
                text(letter, size = letter_size, halign = "center",
                     valign = "center", font = letter_font);
    }
}

module spell_tile_plug(thickness = thickness, letter = letter, letter_size = letter_size,
                        letter_depth = letter_depth, letter_font = letter_font) {
    if (letter != "" && letter != "?")
        icon_plug(thickness, letter_depth)
            text(letter, size = letter_size, halign = "center",
                 valign = "center", font = letter_font);
}

module spell_tile(thickness = thickness, bevel_h = bevel_h,
                   a_mid = a_mid, c_mid = c_mid, a_end = a_end, c_end = c_end,
                   letter = letter, letter_size = letter_size,
                   letter_depth = letter_depth, letter_font = letter_font,
                   letter_mode = letter_mode) {
    if (letter_mode == "pocket") {
        spell_tile_base(thickness, bevel_h, a_mid, c_mid, a_end, c_end,
                         letter, letter_size, letter_depth, letter_font);
    } else if (letter_mode == "inlay") {
        color("Gainsboro")
            spell_tile_base(thickness, bevel_h, a_mid, c_mid, a_end, c_end,
                             letter, letter_size, letter_depth, letter_font);
        color("Crimson")
            spell_tile_plug(thickness, letter, letter_size, letter_depth, letter_font);
    } else if (letter_mode == "flush") {
        union() {
            spell_tile_base(thickness, bevel_h, a_mid, c_mid, a_end, c_end,
                             letter, letter_size, letter_depth, letter_font);
            spell_tile_plug(thickness, letter, letter_size, letter_depth, letter_font);
        }
    }
}

spell_tile();
