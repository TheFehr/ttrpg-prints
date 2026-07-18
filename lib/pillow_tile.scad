// pillow_tile.scad
//
// Reusable "pillow edge" rounded-square tile base. Reverse engineered from
// SpellTiles.stl by slicing the mesh at many Z heights: a 20x20x4mm tile
// with an ~6mm corner radius, a 1.5mm sphere-radius bevel on the top and
// bottom edges, and a 1mm flat land in the middle. Shared by any design/
// that wants the same tactile edge profile.

module rounded_square(size, r, $fn = 32) {
    s = size / 2 - r;
    assert(s >= 0, "rounded_square: corner radius too large for size");
    hull()
        for (x = [-s, s])
            for (y = [-s, s])
                translate([x, y]) circle(r = r, $fn = $fn);
}

// A tile with a smooth "pillow" edge: a flat land in the middle, with the
// top and bottom bevelling away with the curvature of a sphere of radius
// bevel_r. Built as minkowski(flat rounded-square core, sphere) so the
// curvature is a true fillet rather than a chamfer.
module pillow_tile(size = 20, thickness = 4, corner_r = 6, bevel_r = 1.5, $fn = 32) {
    core_h = thickness - 2 * bevel_r;
    inner_size = size - 2 * bevel_r;
    inner_r = corner_r - bevel_r;
    assert(inner_r >= 0, "pillow_tile: bevel_r must be <= corner_r");
    assert(core_h >= 0, "pillow_tile: 2*bevel_r must be <= thickness");

    translate([0, 0, bevel_r])
        minkowski() {
            linear_extrude(height = core_h)
                rounded_square(inner_size, inner_r, $fn = $fn);
            sphere(r = bevel_r, $fn = $fn);
        }
}

// Raised boss for an icon/text/logo dropped onto a pillow_tile(). `height`
// is measured down from the tile's top face (z = thickness), so the boss is
// always flush with the highest point of the pillow bevel, and reaches
// `height - (thickness/2 - bevel_r)`-ish into the flat core for adhesion
// (the default height=2 with the default tile dimensions matches the
// original's embossed icons exactly).
module icon_boss(thickness = 4, height = 2) {
    translate([0, 0, thickness - height])
        linear_extrude(height = height)
            children();
}

// Inverse of icon_boss: engraves the 2D child into the top of the tile
// instead of raising it. Use inside a difference() with pillow_tile().
module icon_pocket(thickness = 4, depth = 1) {
    translate([0, 0, thickness - depth])
        linear_extrude(height = depth + 0.1)
            children();
}
