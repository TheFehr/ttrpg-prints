// spell_tile_plate.scad
//
// Lays out a full 10x11 grid of spell_tile()s on a 22mm pitch, matching the
// original SpellTiles.stl plate layout. Each string in a letter set is one
// row (top row first), each character one tile; "?" is a blank tile (no
// letter -- used as a wildcard in word-tile play).
//
// These are drawn blind out of a bag, so by default every tile uses
// letter_mode="pocket" (letter engraved as a recess only -- no raised boss,
// safe against being identified by touch). Render spell_tile_plate() as-is
// for a single-material, single-plate, blind-draw-safe print.
//
// For a two-color/AMS print instead, render spell_tile_plate_base() (all
// bases with pockets, one color) and spell_tile_plate_plug() (all letter
// plugs, positioned to match, a second color) as separate objects/exports --
// both stay perfectly flush, just realized in two materials instead of one.
//
// NOTE: F6/render (full CGAL evaluation) is needed to see the pockets --
// the fast F5 preview shows raw geometry without booleans applied.

include <spell_tile.scad>

/* [Plate] */
pitch = 22;

// The letter distribution reconstructed from the original plate (for
// reference / regenerating the original set).
letters_original = [
    "AAAAAAABBB",
    "HIIIIIIJJC",
    "HOPPPQQRKC",
    "HOTTUUURKC",
    "HOTYYYURLC",
    "HOTX?ZVRLD",
    "GOTX?ZVRLD",
    "GOTWWWWSLD",
    "GNTTSSSSLD",
    "FNNNNMMMMD",
    "FFEEEEEEEE",
];

// The set to print today: a word-game-style frequency distribution (16 E's
// down to single copies of J/Q/X/Y/Z, plus 2 blanks).
letters_today = [
    "EEEEEEEEEE",
    "NNNNEEEEEE",
    "NNNNNNSSSS",
    "RRRRRRSSSS",
    "RAAAAAAAII",
    "TTTTTIIIII",
    "TTDDDDDUUU",
    "LLLLHHHHUU",
    "CCCGGGMMMO",
    "KKFFWWBBOO",
    "ZZPVJYXQ??",
];

letters = letters_today;

module spell_tile_plate(letters = letters, pitch = pitch, letter_mode = "pocket") {
    rows = len(letters);
    for (r = [0 : rows - 1]) {
        row = letters[r];
        cols = len(row);
        for (c = [0 : cols - 1])
            translate([c * pitch, (rows - 1 - r) * pitch, 0])
                spell_tile(letter = row[c], letter_mode = letter_mode);
    }
}

// All bases (with pockets, no plugs) -- one color/material.
module spell_tile_plate_base(letters = letters, pitch = pitch) {
    rows = len(letters);
    for (r = [0 : rows - 1]) {
        row = letters[r];
        cols = len(row);
        for (c = [0 : cols - 1])
            translate([c * pitch, (rows - 1 - r) * pitch, 0])
                spell_tile_base(letter = row[c]);
    }
}

// All letter plugs only, positioned to match spell_tile_plate_base() exactly
// -- second color/material for a two-color/AMS print.
module spell_tile_plate_plug(letters = letters, pitch = pitch) {
    rows = len(letters);
    for (r = [0 : rows - 1]) {
        row = letters[r];
        cols = len(row);
        for (c = [0 : cols - 1])
            translate([c * pitch, (rows - 1 - r) * pitch, 0])
                spell_tile_plug(letter = row[c]);
    }
}

spell_tile_plate();
