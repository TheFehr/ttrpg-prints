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

use <../../lib/pillow_tile.scad>

// OpenSCAD's text(halign="center", valign="center") centers on the glyph's
// *advance* box, not its visual ink -- most letters have unequal left/right
// side bearings (by design, in every font), so the visible letter ends up
// measurably off-center within the tile (up to ~1.3mm on a 20mm tile for
// letters like "J"). textmetrics() reports the real ink bounding box, so
// re-center on that instead. Requires the `textmetrics` experimental
// feature (Edit > Preferences > Features in the GUI, or `--enable=textmetrics`
// on the CLI) -- without it, textmetrics() returns undef and this silently
// falls back to plain (advance-centered) text(), so nothing breaks, it's
// just slightly off-center. (This is also why the browser preview -- whose
// WASM OpenSCAD build has no fonts/fontconfig at all, so textmetrics()
// always comes back undef there -- needs no separate handling: its own
// text() override already centers on true ink extents directly.)
module centered_text(t, size, font) {
    m = textmetrics(t, size = size, halign = "center", valign = "center", font = font);
    off = (m == undef) ? [0, 0] : [m.position.x + m.size.x / 2, m.position.y + m.size.y / 2];
    translate([-off.x, -off.y])
        text(t, size = size, halign = "center", valign = "center", font = font);
}

/* [Tile] */
thickness = 4;
bevel_h = 1.5;
a_mid = 10.0;
c_mid = 5.921;
a_end = 9.478;
c_end = 5.552;

/* [Letter] */
letter = "A";
// 10 is the largest size at which every letter (worst case: "W", the
// widest glyph) still fits inside the tile's pocket-eligible area (the top
// face, the narrowest cross-section the pocket passes through: apothem
// a_end=9.478mm, corner chamfer leg c_end=5.552mm) with margin to spare --
// at the old default of 13, W's ink bounding box overshot the corner
// chamfer by ~2.6mm (diagonal reach 15.99mm vs the 13.4mm available).
letter_size = 10;
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
                centered_text(letter, letter_size, letter_font);
    }
}

module spell_tile_plug(thickness = thickness, letter = letter, letter_size = letter_size,
                        letter_depth = letter_depth, letter_font = letter_font) {
    if (letter != "" && letter != "?")
        icon_plug(thickness, letter_depth)
            centered_text(letter, letter_size, letter_font);
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
