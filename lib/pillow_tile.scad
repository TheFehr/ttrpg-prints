// pillow_tile.scad
//
// Reusable faceted-octagon tile base, reverse engineered from the original
// Fusion 360 model (SpellTiles.step, read exactly via OpenCascade -- every
// face in the model is a flat plane, no curves anywhere). The footprint is
// a chamfered square (an irregular octagon: 4 axis-aligned flat sides + 4
// 45-degree corner chamfers), and the top/bottom edge is a two-stage flat
// taper (chamfer down, short flat land, chamfer back up) rather than a
// round bevel -- what reads as a soft "pillow" edge is actually 16 flat
// facets per tile.
//
// Measured (110/110 tiles sampled, exact to the STEP file's B-rep, not a
// triangulated approximation):
//   overall size:      20 x 20 x 4mm
//   flat core (widest): apothem 10.0mm,   corner chamfer leg 5.921mm
//   top/bottom edge:    apothem 9.478mm,  corner chamfer leg 5.552mm
//   bevel height:       1.5mm each (top and bottom), 1mm flat core between

// A square of half-width `a` with its 4 corners cut by a 45-degree chamfer
// of leg length `c` (so a plain square is chamfer(a, 0)).
module chamfered_square(a, c) {
    polygon(points = [
        [a - c, a], [-(a - c), a], [-a, a - c], [-a, -(a - c)],
        [-(a - c), -a], [a - c, -a], [a, -(a - c)], [a, a - c]
    ]);
}

// Straight-facet loft between two chamfered_square() cross-sections `height`
// apart (a hull of two near-zero-height extrusions -- reproduces the
// original's flat chamfer facets exactly, no curvature).
module chamfer_loft(a_bottom, c_bottom, a_top, c_top, height) {
    eps = 0.01;
    hull() {
        linear_extrude(height = eps)
            chamfered_square(a_bottom, c_bottom);
        translate([0, 0, height - eps])
            linear_extrude(height = eps)
                chamfered_square(a_top, c_top);
    }
}

// The tile base: bottom chamfer taper, flat core, top chamfer taper.
// `a_mid`/`c_mid` describe the widest (flat core) cross-section; `a_end`/
// `c_end` describe the bottom and top faces (both the same shape).
module pillow_tile(thickness = 4, bevel_h = 1.5,
                    a_mid = 10.0, c_mid = 5.921,
                    a_end = 9.478, c_end = 5.552) {
    core_h = thickness - 2 * bevel_h;
    assert(core_h >= 0, "pillow_tile: 2*bevel_h must be <= thickness");

    chamfer_loft(a_end, c_end, a_mid, c_mid, bevel_h);

    translate([0, 0, bevel_h])
        linear_extrude(height = core_h)
            chamfered_square(a_mid, c_mid);

    translate([0, 0, bevel_h + core_h])
        chamfer_loft(a_mid, c_mid, a_end, c_end, bevel_h);
}

// Raised boss for an icon/text/logo on top of a pillow_tile(), for
// single-material printing. `embed` is how far it reaches down below the
// tile's top face (z = thickness) for adhesion; `rise` is how far it
// protrudes above it, so the letter is actually visible/tactile in one
// color. (In the original CAD, this is instead a separate plug solid sized
// to sit exactly flush in a matching pocket -- flat, not raised -- meant
// for a filament swap / dual-color print. See icon_pocket() to reproduce
// that two-body approach.)
module icon_boss(thickness = 4, embed = 1.4, rise = 0.6) {
    translate([0, 0, thickness - embed])
        linear_extrude(height = embed + rise)
            children();
}

// Inverse of icon_boss: cuts a flush pocket into the top of the tile instead
// of raising a boss -- matches the original's two-body pocket+plug design.
// Use inside a difference() with pillow_tile(), then print icon_boss() as a
// separate part (or in a different color) to plug into the resulting hole.
module icon_pocket(thickness = 4, depth = 2) {
    translate([0, 0, thickness - depth])
        linear_extrude(height = depth + 0.1)
            children();
}
