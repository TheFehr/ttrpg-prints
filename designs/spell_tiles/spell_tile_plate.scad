// spell_tile_plate.scad
//
// Lays out a full grid of spell_tile()s on a configurable pitch, matching
// the original SpellTiles.stl plate layout at the defaults (22mm pitch,
// 10x11). Each letter set is one newline-joined string -- one row per
// line, one character per tile; "?" is a blank tile (no letter -- used as
// a wildcard in word-tile play). Rows can be any length/count and don't
// need to match each other.
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

use <spell_tile.scad>

// letter_size/letter_depth/letter_mode/letter_font are redeclared here
// (rather than left to spell_tile.scad's own top-level defaults, which
// `use <spell_tile.scad>` can't see or override from outside) and threaded
// through explicitly to every spell_tile() call below -- so they're real,
// independently overridable Customizer params on *this* file too, both on
// the desktop and in the browser preview, not just on a single tile.

// Joins a list of strings with `sep` (recursive -- OpenSCAD has no builtin).
function join(strings, sep = "") =
    len(strings) == 0 ? "" :
    len(strings) == 1 ? strings[0] :
    str(strings[0], sep, join([for (i = [1 : len(strings) - 1]) strings[i]], sep));

function substr(s, from, to) =
    to < from ? "" : join([for (i = [from : to]) s[i]]);

// Splits a string on a single-character `sep` -- letters_<lang> are stored
// as one newline-joined string (giving them a real Customizer textarea --
// see the [textarea] tag below -- instead of being invisible to Customizer
// entirely, which is what an array of strings is: OpenSCAD's real
// Customizer only recognizes Number/Text/Boolean/Vector-of-numbers).
function str_split(s, sep = "\n") =
    let(m = search(sep, s, 0))
    let(idxs = (m == undef || len(m) == 0) ? [] : m[0])
    let(bounds = concat([-1], idxs, [len(s)]))
    [for (i = [0 : len(bounds) - 2]) substr(s, bounds[i] + 1, bounds[i + 1] - 1)];

/* [Plate] */
pitch = 22; // [10:1:40]
letter_set = "german"; // [german:German (unofficial SPELL-style),english:English (official SPELL list)]

/* [Letter] */
letter_size = 10; // [4:0.5:18]
letter_depth = 1.2; // [0.4:0.1:1.8]
letter_mode = "pocket"; // [pocket:Pocket (blind-safe),inlay:Inlay (2-color),flush:Flush]
letter_font = "DejaVu Sans:style=Bold";

// [textarea] (used below) has to be a trailing comment on the assignment's
// own line, not up here with the descriptive prose -- same rule real
// OpenSCAD Customizer range/dropdown constraints already follow -- or it
// never gets parsed as anything but literal description text. This note
// itself sits before the next `/* [Group] */` header specifically so it
// doesn't leak into either field's own description below.

/* [Letters] */
// English: the official SPELL letter-frequency list, taken from SPELL's own
// print-at-home PDF (not reverse engineered -- this one's authoritative).
// One row per line, one character per tile, a question mark for a
// blank/wildcard tile.
letters_english = "AAAAAAABBB\nHIIIIIIJJC\nHOPPPQQRKC\nHOTTUUURKC\nHOTYYYURLC\nHOTX?ZVRLD\nGOTX?ZVRLD\nGOTWWWWSLD\nGNTTSSSSLD\nFNNNNMMMMD\nFFEEEEEEEE"; // [textarea]

// German: an unofficial attempt at the same approach SPELL took for
// English, adapted to German letter frequency -- not an official list. 16
// E's down to single copies of J/Q/X/Y/Z, plus 2 blanks.
letters_german = "EEEEEEEEEE\nNNNNEEEEEE\nNNNNNNSSSS\nRRRRRRSSSS\nRAAAAAAAII\nTTTTTIIIII\nTTDDDDDUUU\nLLLLHHHHUU\nCCCGGGMMMO\nKKFFWWBBOO\nZZPVJYXQ??"; // [textarea]

/* [Hidden] */
letters = str_split(letter_set == "english" ? letters_english : letters_german);

module spell_tile_plate(letters = letters, pitch = pitch, letter_mode = letter_mode,
                         letter_size = letter_size, letter_depth = letter_depth,
                         letter_font = letter_font) {
    rows = len(letters);
    for (r = [0 : rows - 1]) {
        row = letters[r];
        cols = len(row);
        for (c = [0 : cols - 1])
            translate([c * pitch, (rows - 1 - r) * pitch, 0])
                spell_tile(letter = row[c], letter_mode = letter_mode,
                           letter_size = letter_size, letter_depth = letter_depth,
                           letter_font = letter_font);
    }
}

// All bases (with pockets, no plugs) -- one color/material.
module spell_tile_plate_base(letters = letters, pitch = pitch,
                              letter_size = letter_size, letter_depth = letter_depth,
                              letter_font = letter_font) {
    rows = len(letters);
    for (r = [0 : rows - 1]) {
        row = letters[r];
        cols = len(row);
        for (c = [0 : cols - 1])
            translate([c * pitch, (rows - 1 - r) * pitch, 0])
                spell_tile_base(letter = row[c], letter_size = letter_size,
                                 letter_depth = letter_depth, letter_font = letter_font);
    }
}

// All letter plugs only, positioned to match spell_tile_plate_base() exactly
// -- second color/material for a two-color/AMS print.
module spell_tile_plate_plug(letters = letters, pitch = pitch,
                              letter_size = letter_size, letter_depth = letter_depth,
                              letter_font = letter_font) {
    rows = len(letters);
    for (r = [0 : rows - 1]) {
        row = letters[r];
        cols = len(row);
        for (c = [0 : cols - 1])
            translate([c * pitch, (rows - 1 - r) * pitch, 0])
                spell_tile_plug(letter = row[c], letter_size = letter_size,
                                 letter_depth = letter_depth, letter_font = letter_font);
    }
}

spell_tile_plate();
