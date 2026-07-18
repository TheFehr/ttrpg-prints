self.postMessage({ type: 'log', text: '[worker] script start' });

let cachedMod = null;
let cachedSources = null; // { libSrc, tileSrc, plateSrc, letterSets }
let cachedFont = null;

// Timestamps every debug-log line with seconds elapsed since the current
// render request started, so a stalled-looking UI can be told apart from a
// slow-but-progressing one. Reset at the top of each onmessage.
let renderT0 = performance.now();
function tlog(text) {
  const elapsed = ((performance.now() - renderT0) / 1000).toFixed(1);
  self.postMessage({ type: 'log', text: `[+${elapsed}s] ${text}` });
}

// Escape a user-typed letter for embedding in an OpenSCAD string literal.
function scadString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Pulls the `letters_english = [...]` / `letters_german = [...]` row arrays
// out of the fetched plate source (rather than duplicating them here) so
// the preview can never drift from what the real plate file would print.
function parseLetterSets(plateSrc) {
  const sets = {};
  const re = /(letters_\w+)\s*=\s*\[([\s\S]*?)\];/g;
  let m;
  while ((m = re.exec(plateSrc))) {
    const rows = [...m[2].matchAll(/"([^"]*)"/g)].map(x => x[1]);
    if (rows.length) sets[m[1]] = rows;
  }
  return sets;
}

// The real module layout: designs/spell_tiles/{spell_tile,spell_tile_plate}.scad
// use <../../lib/pillow_tile.scad> / <spell_tile.scad> -- write all three files
// into the WASM virtual FS at the same relative paths so those resolve
// unmodified, instead of maintaining a flattened copy that could drift.
async function fetchSources() {
  if (cachedSources) return cachedSources;
  tlog('fetching SCAD sources…');
  const [libSrc, tileSrc, plateSrc] = await Promise.all([
    fetch('../../../lib/pillow_tile.scad').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} fetching lib/pillow_tile.scad`);
      return r.text();
    }),
    fetch('../spell_tile.scad').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} fetching spell_tile.scad`);
      return r.text();
    }),
    fetch('../spell_tile_plate.scad').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} fetching spell_tile_plate.scad`);
      return r.text();
    }),
  ]);
  const letterSets = parseLetterSets(plateSrc);
  cachedSources = { libSrc, tileSrc, plateSrc, letterSets };
  tlog(`sources loaded (lib ${libSrc.length}b, tile ${tileSrc.length}b, plate ${plateSrc.length}b, letter sets: ${Object.keys(letterSets).join(', ')})`);
  return cachedSources;
}

// ── Text-to-polygon ──────────────────────────────────────────────────────────
// openscad-wasm@0.0.4 (and the actively-maintained openscad-wasm-prebuilt
// fork) ship with *no* font data at all -- no .ttf/.woff anywhere in the
// bundle, and the addFonts() the .d.ts advertises doesn't exist in the
// actual JS. text() can never produce glyphs in-browser as a result. Instead
// of touching spell_tile.scad (which is correct -- desktop openscad-nightly
// has real fonts), render each letter to a vector outline ourselves with
// opentype.js + a real DejaVu Sans Bold webfont, and inject a `module
// text(...) {}` that dispatches on the string argument to the matching
// precomputed polygon() -- shadowing the OpenSCAD builtin by name (a
// user-defined module takes precedence over a builtin of the same name), so
// icon_pocket()/icon_plug()'s own `text(letter, ...)` calls pick it up
// unmodified whether rendering one tile or all 110 (each with a different
// letter) on a plate.
const FONT_URL = 'https://cdn.jsdelivr.net/npm/@fontsource/dejavu-sans@5.2.5/files/dejavu-sans-latin-700-normal.woff';

async function getFont() {
  if (cachedFont) return cachedFont;
  tlog('loading opentype.js + font…');
  const ot = await import('https://cdn.jsdelivr.net/npm/opentype.js@2.0.0/+esm');
  const buf = await fetch(FONT_URL).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} fetching font`);
    return r.arrayBuffer();
  });
  cachedFont = ot.parse(buf);
  tlog('font ready');
  return cachedFont;
}

// Flattens an opentype.js Path (M/L/C/Q/Z commands) into subpaths of [x,y]
// points, tessellating bezier curves. Each subpath is one polygon() "paths"
// entry -- letters with counters (A, O, D, Q, R, B, …) come out as an outer
// contour + inner hole contour(s), same as OpenSCAD's own text() would.
// opentype.js uses canvas-style Y-down coordinates (ascenders are negative
// Y); OpenSCAD's polygon() is math-style Y-up. Negate Y on the way out so
// the glyph isn't upside down -- a uniform mirror flips every contour's
// winding together, so outer/hole relationships polygon() relies on for
// letters like A/O/Q/D still come out correct.
function flattenPath(path, segments = 10) {
  const subpaths = [];
  let current = null;
  let cx = 0, cy = 0;

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      current = [[cmd.x, -cmd.y]];
      subpaths.push(current);
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'L') {
      current.push([cmd.x, -cmd.y]);
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'C') {
      for (let i = 1; i <= segments; i++) {
        const t = i / segments, mt = 1 - t;
        const x = mt*mt*mt*cx + 3*mt*mt*t*cmd.x1 + 3*mt*t*t*cmd.x2 + t*t*t*cmd.x;
        const y = mt*mt*mt*cy + 3*mt*mt*t*cmd.y1 + 3*mt*t*t*cmd.y2 + t*t*t*cmd.y;
        current.push([x, -y]);
      }
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'Q') {
      for (let i = 1; i <= segments; i++) {
        const t = i / segments, mt = 1 - t;
        const x = mt*mt*cx + 2*mt*t*cmd.x1 + t*t*cmd.x;
        const y = mt*mt*cy + 2*mt*t*cmd.y1 + t*t*cmd.y;
        current.push([x, -y]);
      }
      cx = cmd.x; cy = cmd.y;
    } // 'Z' needs no point -- polygon() closes each path implicitly
  }
  return subpaths.filter(sp => sp.length >= 3);
}

// Builds a glyph path manually, one character at a time, positioned by
// simple advance-width summation. opentype.js's own getPath()/stringToGlyphs
// applies the font's full GSUB shaping (ligatures, kerning tables, …) and
// throws ("substFormat: 2 is not yet supported") on lookup formats it
// doesn't implement -- DejaVu Sans Bold hits this for some multi-character
// strings. Tile labels don't need ligatures/kerning, so sidestep it entirely.
function getTextPathManual(font, text, fontSize) {
  const scale = fontSize / font.unitsPerEm;
  let x = 0;
  const commands = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    commands.push(...glyph.getPath(x, 0, fontSize).commands);
    x += glyph.advanceWidth * scale;
  }
  return { commands };
}

// OpenSCAD's real text(size=N) (used by desktop openscad-nightly for the
// pregen files and any local render) does *not* map 1:1 onto font units the
// way opentype.js's `fontSize / unitsPerEm` scaling does -- measured against
// the same DejaVu Sans Bold font file via `textmetrics()`, OpenSCAD's glyphs
// come out a consistent ~1.389x larger than opentype.js's for the same
// nominal `size`. Without this, the live/browser render (this file) shows
// letters ~28% smaller than what desktop OpenSCAD (and the pregen files)
// actually produce for the same letter_size -- correct for it here so both
// paths agree on what a given letter_size actually looks like.
const OPENSCAD_FONT_SIZE_FACTOR = 100 / 72;

// polygon(points=…, paths=…) literal for one string, pre-centered on the
// origin to match spell_tile.scad's halign="center", valign="center" calls.
// Returns null if the string produces no glyph outlines (e.g. a space).
function letterPolygonLiteral(font, letter, fontSize) {
  const path = getTextPathManual(font, letter, fontSize * OPENSCAD_FONT_SIZE_FACTOR);
  const subpaths = flattenPath(path);
  if (subpaths.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const sp of subpaths) for (const [x, y] of sp) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const dx = -(minX + maxX) / 2;
  const dy = -(minY + maxY) / 2;

  const points = [];
  const paths = [];
  for (const sp of subpaths) {
    const idx = [];
    for (const [x, y] of sp) {
      idx.push(points.length);
      points.push(`[${(x + dx).toFixed(3)},${(y + dy).toFixed(3)}]`);
    }
    paths.push(`[${idx.join(',')}]`);
  }
  return `polygon(points=[${points.join(',')}], paths=[${paths.join(',')}])`;
}

// Builds a `module text(t, size, halign, valign, font) {...}` that dispatches
// on `t` to a precomputed polygon() per unique letter -- needed for a full
// plate, where every tile's text() call passes a different letter. `letters`
// may contain duplicates/blank entries; both are handled fine (deduped, and
// blanks are simply never reached since spell_tile.scad already skips
// calling text() for "" / "?").
async function buildTextOverride(letters, fontSize) {
  const unique = [...new Set(letters)].filter(l => l && l !== '?');
  if (unique.length === 0) return 'module text(t, size, halign, valign, font) {}';

  const font = await getFont();
  const branches = [];
  for (const letter of unique) {
    const lit = letterPolygonLiteral(font, letter, fontSize);
    if (lit) branches.push(`if (t == "${scadString(letter)}") ${lit};`);
  }
  if (branches.length === 0) return 'module text(t, size, halign, valign, font) {}';

  return `module text(t, size, halign, valign, font) {\n  ${branches.join('\n  else ')}\n}`;
}

// Substitutes the shared Customizer variables at the top of spell_tile.scad
// (letter size/depth/mode; `letter` itself only matters for single-tile
// mode -- plate mode overrides it per cell) and prepends the text() override.
// NOTE: match only up to the statement's trailing `;`, not `$` -- the
// letter_mode line has an inline `// "pocket", "inlay", "flush"` comment
// after its semicolon, so an end-of-line-anchored pattern silently fails
// to match (and silently leaves the default in place) on that line.
function buildTileSrc(tileSrc, { letter, mode, size, depth }, textOverride) {
  const src = tileSrc
    .replace(/^letter\s*=\s*"[^"]*";/m, `letter = "${scadString(letter ?? '')}";`)
    .replace(/^letter_size\s*=\s*[^;]*;/m, `letter_size = ${size};`)
    .replace(/^letter_depth\s*=\s*[^;]*;/m, `letter_depth = ${depth};`)
    .replace(/^letter_mode\s*=\s*"[^"]*";/m, `letter_mode = "${mode}";`);
  return `${textOverride}\n\n${src}`;
}

// Forces a source's trailing top-level call to be a specific module
// invocation instead (e.g. `spell_tile_base();`), for single-part passes.
function forceCall(src, defaultCallRe, call) {
  return src.replace(defaultCallRe, `\n${call}\n`);
}

async function getMod() {
  if (cachedMod) return cachedMod;
  tlog('loading OpenSCAD WASM module…');
  try {
    cachedMod = await import('https://cdn.jsdelivr.net/npm/openscad-wasm@0.0.4/openscad.js');
    tlog('WASM module loaded');
  } catch (e) {
    const msg = 'WASM module load failed: ' + (e.message || e);
    self.postMessage({ type: 'error', message: msg });
    throw new Error(msg);
  }
  return cachedMod;
}

// Each render pass needs its own fresh WASM instance — openscad-wasm@0.0.4 uses
// Emscripten which exits the runtime after the first callMain(), making any
// subsequent callMain() on the same instance throw a raw error code.
//
// NOTE on the timing gap you'll see around "invoking callMain": this WASM
// build has no Manifold backend (checked -- the string doesn't appear
// anywhere in either openscad-wasm@0.0.4 or the openscad-wasm-prebuilt
// fork's bundle), so boolean ops fall back to OpenSCAD's old CGAL exact-
// arithmetic kernel. That's why a 110-tile plate that renders in ~4s on
// desktop openscad-nightly (Manifold) can take 1-2 *minutes* here per pass.
// callMain() is also synchronous and blocks this single worker thread
// completely -- no postMessage, no timers -- so there is no possible
// "20% done" progress output during that gap; the elapsed-time delta
// between the "invoking callMain" line and the vertex-count line after it
// is the only signal available that it's still working and not hung.
async function renderPass(mod, { libSrc, tileSrc, plateSrc }, entry, label) {
  const passT0 = performance.now();
  let inst;
  try {
    inst = await mod.createOpenSCAD({
      noInitialRun: true,
      print:    (t) => self.postMessage({ type: 'log', text: t }),
      printErr: (t) => self.postMessage({ type: 'log', text: t }),
    });
  } catch (e) {
    tlog(`${label}: WASM init failed: ${e.message || e}`);
    return null;
  }

  const wasm = await inst.getInstance();
  const outFile = `/out_${label}.off`;
  wasm.FS.mkdir('/lib');
  wasm.FS.mkdir('/designs');
  wasm.FS.mkdir('/designs/spell_tiles');
  wasm.FS.writeFile('/lib/pillow_tile.scad', libSrc);
  wasm.FS.writeFile('/designs/spell_tiles/spell_tile.scad', tileSrc);
  if (plateSrc) wasm.FS.writeFile('/designs/spell_tiles/spell_tile_plate.scad', plateSrc);

  tlog(`${label}: invoking callMain (blocks this thread until done, no progress possible until it returns)…`);
  const exit = wasm.callMain([entry, '-o', outFile]);
  const passSec = ((performance.now() - passT0) / 1000).toFixed(1);
  if (exit !== 0) {
    tlog(`${label}: exit ${exit} (after ${passSec}s)`);
    return null;
  }
  try {
    const off = wasm.FS.readFile(outFile, { encoding: 'utf8' });
    const nv = parseInt(off.split('\n')[0].split(/\s+/)[1] ?? '0', 10);
    tlog(`${label}: ${nv} vertices (pass took ${passSec}s)`);
    return nv > 0 ? off : null;
  } catch {
    return null;
  }
}

self.onmessage = async ({ data }) => {
  if (data.type !== 'render') return;
  const params = data.params;
  const isPlate = params.view === 'plate';
  const isInlay = params.mode === 'inlay';

  renderT0 = performance.now();
  // No Manifold backend in this WASM build (see renderPass) -- booleans run
  // on the slow CGAL kernel, observed ~1-2 minutes per 110-tile plate pass.
  // Inlay needs two full passes (base then plug) back to back.
  const timeoutSec = !isPlate ? 90 : (isInlay ? 600 : 300);
  tlog(`render requested: view=${params.view} mode=${params.mode}` +
       (isPlate ? ` letterSet=${params.letterSet}` : ` letter="${params.letter}"`) +
       ` (timeout ${timeoutSec}s)`);
  const timeout = setTimeout(() => {
    self.postMessage({ type: 'error', message: `Render timed out after ${timeoutSec}s` });
  }, timeoutSec * 1000);

  try {
    const [mod, sources] = await Promise.all([getMod(), fetchSources()]);
    const parts = [];

    if (isPlate) {
      const grid = sources.letterSets[params.letterSet] ?? Object.values(sources.letterSets)[0];
      const allLetters = grid.join('').split('');
      const textOverride = await buildTextOverride(allLetters, params.size);
      const tileSrc = buildTileSrc(sources.tileSrc, params, textOverride);

      const plateBase = sources.plateSrc.replace(
        /^letters\s*=\s*letters_\w+;/m, `letters = ${params.letterSet};`,
      );
      const entry = '/designs/spell_tiles/spell_tile_plate.scad';
      const callRe = /\nspell_tile_plate\(\);\s*$/;

      if (params.mode === 'inlay') {
        const baseSrc = forceCall(plateBase, callRe, 'spell_tile_plate_base();');
        const offBase = await renderPass(mod, { ...sources, tileSrc, plateSrc: baseSrc }, entry, 'plate-base');
        if (offBase) parts.push({ off: offBase, color: 'Gainsboro', label: 'plate-base' });

        const plugSrc = forceCall(plateBase, callRe, 'spell_tile_plate_plug();');
        const offPlug = await renderPass(mod, { ...sources, tileSrc, plateSrc: plugSrc }, entry, 'plate-plug');
        if (offPlug) parts.push({ off: offPlug, color: 'Crimson', label: 'plate-plug' });
      } else {
        const src = forceCall(plateBase, callRe, `spell_tile_plate(letter_mode="${params.mode}");`);
        const off = await renderPass(mod, { ...sources, tileSrc, plateSrc: src }, entry, 'plate');
        if (off) parts.push({ off, color: null, label: 'plate' });
      }
    } else {
      const textOverride = await buildTextOverride([params.letter], params.size);
      const tileSrc = buildTileSrc(sources.tileSrc, params, textOverride);
      const entry = '/designs/spell_tiles/spell_tile.scad';
      const callRe = /\nspell_tile\(\);\s*$/;

      if (params.mode === 'inlay') {
        const baseSrc = forceCall(tileSrc, callRe, 'spell_tile_base();');
        const offBase = await renderPass(mod, { ...sources, tileSrc: baseSrc }, entry, 'base');
        if (offBase) parts.push({ off: offBase, color: 'Gainsboro', label: 'base' });

        const plugSrc = forceCall(tileSrc, callRe, 'spell_tile_plug();');
        const offPlug = await renderPass(mod, { ...sources, tileSrc: plugSrc }, entry, 'plug');
        if (offPlug) parts.push({ off: offPlug, color: 'Crimson', label: 'plug' });
      } else {
        const src = forceCall(tileSrc, callRe, 'spell_tile();');
        const off = await renderPass(mod, { ...sources, tileSrc: src }, entry, params.mode);
        if (off) parts.push({ off, color: null, label: params.mode });
      }
    }

    clearTimeout(timeout);
    tlog(`done — ${parts.length} part(s) with geometry`);
    self.postMessage({ type: 'result', parts, params });
  } catch (err) {
    clearTimeout(timeout);
    self.postMessage({ type: 'error', message: String(err?.message ?? err ?? 'unknown') });
  }
};
