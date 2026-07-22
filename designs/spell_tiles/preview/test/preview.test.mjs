// Headless-browser regression test for designs/spell_tiles/preview --
// exercises the actual page in a real (if headless) browser, not just
// static/syntax checks. Written after a manual pass with these exact
// techniques caught four real bugs on the first openscad-customizer-web
// migration (see the PR that added this file): a CDN path that 404'd, a
// same-origin Worker() restriction, a broken dropdown parse, and a
// misplaced [textarea] tag. None of those would have been caught without
// actually loading the page.
//
// Run: npm ci && npm test (from this directory). Also runs in CI
// (.github/workflows/test.yml) on every PR, including Renovate's version-
// bump PRs for the CDN-pinned openscad-customizer-web/three versions.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';

// puppeteer-core, not puppeteer: the bundled-Chromium download is a ~200MB
// fetch from a Google CDN that's proven flaky in sandboxed dev environments,
// and CI (see .github/workflows/test.yml) already has a real Chrome/Chromium
// preinstalled -- so this finds *some* real browser on PATH instead of
// downloading its own. Override with PUPPETEER_EXECUTABLE_PATH if none of
// these names match on a given machine.
function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  for (const cmd of ['google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium']) {
    try {
      return execSync(`command -v ${cmd}`, { encoding: 'utf8' }).trim();
    } catch { /* try next */ }
  }
  throw new Error('No Chrome/Chromium found on PATH -- set PUPPETEER_EXECUTABLE_PATH.');
}

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const PORT = 8099;
const BASE_URL = `http://localhost:${PORT}`;
const PREVIEW_URL = `${BASE_URL}/designs/spell_tiles/preview/preview.html?debug`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.scad': 'text/plain', '.stl': 'model/stl', '.3mf': 'model/3mf+xml', '.json': 'application/json' };

function serveStatic() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const path = join(REPO_ROOT, decodeURIComponent(req.url.split('?')[0]));
        const data = await readFile(path);
        res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function pollUntil(page, predicate, { timeoutMs = 30000, intervalMs = 500 } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await predicate();
    if (last) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`pollUntil timed out after ${timeoutMs}ms (last value: ${JSON.stringify(last)})`);
}

// Waits for status to move off `notStatus` first (so a status check right
// after triggering a change doesn't read stale "Ready" text from *before*
// the change was even processed -- debounced re-renders don't start
// synchronously), then waits for it to settle on Ready/Error.
async function waitForRenderThenReady(page, notStatus, timeoutMs) {
  await pollUntil(page, async () => {
    const status = await page.evaluate(() => window.__spelltilesTest.getStatus());
    return status !== notStatus ? status : null;
  }, { timeoutMs: Math.min(timeoutMs, 5000) });
  return pollUntil(page, async () => {
    const status = await page.evaluate(() => window.__spelltilesTest.getStatus());
    return /^Ready|^Error/.test(status) ? status : null;
  }, { timeoutMs });
}

async function waitReady(page, timeoutMs) {
  return pollUntil(page, async () => {
    const status = await page.evaluate(() => window.__spelltilesTest.getStatus());
    return /^Ready|^Error/.test(status) ? status : null;
  }, { timeoutMs });
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
  console.log(`  ${condition ? 'ok' : 'FAIL'} - ${message}`);
}

async function main() {
  const server = await serveStatic();
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: [
      '--no-sandbox', '--disable-gpu-sandbox',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist', '--enable-webgl',
    ],
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(`[pageerror] ${err.message}`));
    // Track real HTTP failures via the response event (has the actual URL,
    // so favicon.ico can be excluded precisely) rather than console error
    // *text*, which for a failed resource load is just a generic "Failed to
    // load resource..." string with no URL in it to filter on.
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().endsWith('favicon.ico')) {
        pageErrors.push(`[http ${res.status()}] ${res.url()}`);
      }
    });

    console.log('=== boot: initial Tile-view render ===');
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await waitReady(page, 30000);
    const model1 = await page.evaluate(() => window.__spelltilesTest.getLastModel());
    assert(model1?.parts?.length === 1, `initial Tile pocket render produces exactly 1 part (got ${model1?.parts?.length})`);
    const formLen = await page.$eval('#scad-form', (el) => el.children.length).catch(() => 0);
    assert(formLen >= 2, `auto-generated form has content (${formLen} groups)`);

    console.log('=== Tile + inlay: multiPass (2 render passes, 2 colored parts) ===');
    const statusBeforeInlay = await page.evaluate(() => window.__spelltilesTest.getStatus());
    await page.evaluate(() => {
      const s = [...document.querySelectorAll('#scad-form select')].find((x) => [...x.options].some((o) => o.value === 'inlay'));
      s.dataset.t = 'mode';
    });
    await page.select('#scad-form select[data-t="mode"]', 'inlay');
    await waitForRenderThenReady(page, statusBeforeInlay, 30000);
    const model2 = await page.evaluate(() => window.__spelltilesTest.getLastModel());
    assert(model2?.parts?.length === 2, `Tile inlay render produces exactly 2 parts (got ${model2?.parts?.length})`);
    assert(model2?.parts?.every((p) => p.color), 'both inlay parts have a color assigned');

    console.log('=== Plate view: pregen bypass for default params ===');
    const t0 = Date.now();
    await page.click('input[name="view"][value="plate"]');
    await waitReady(page, 15000);
    const pregenMs = Date.now() - t0;
    const model3 = await page.evaluate(() => window.__spelltilesTest.getLastModel());
    assert(!!model3?.pregenUrl, `default Plate params hit the pregen path (got pregenUrl=${model3?.pregenUrl})`);
    assert(pregenMs < 10000, `pregen load is fast, not a live WASM render (took ${pregenMs}ms)`);

    console.log('=== Plate form: letter_set dropdown + textarea widgets ===');
    const options = await page.$$eval('#scad-form select option', (els) => els.map((o) => ({ value: o.value, label: o.textContent })));
    const letterSetOptions = options.filter((o) => o.value === 'german' || o.value === 'english');
    // A comma inside a dropdown option's *label* used to fracture it into
    // extra bogus options (the naive parser does a plain split(',')) --
    // .length===2 alone doesn't catch that (both real values still show up,
    // just with a truncated label), so check the label text survived whole.
    assert(letterSetOptions.length === 2, `letter_set dropdown has exactly 2 options (got ${letterSetOptions.length}: ${JSON.stringify(options)})`);
    assert(
      letterSetOptions.find((o) => o.value === 'german')?.label === 'German (unofficial SPELL-style)',
      `german option's label wasn't fractured by an internal comma (got: ${JSON.stringify(letterSetOptions)})`,
    );
    const textareas = await page.$$eval('#scad-form textarea', (els) => els.map((t) => t.value.length));
    assert(textareas.length === 2, `both letter grids render as <textarea> (got ${textareas.length})`);
    assert(textareas.every((len) => len > 100), `textareas are prefilled with real content (lengths: ${textareas.join(', ')})`);

    console.log('=== Plate view: live render (edited grid) exercises textGlyphs.targetFsPath ===');
    // Overriding the letters_german *textarea* to a tiny 2x2 grid (not the
    // pitch slider) forces the same live-render / non-pregen / targetFsPath
    // code path as a full 110-tile plate would, but in a couple of seconds
    // instead of ~1-2 min of real CGAL work -- full-plate timing was
    // observed to comfortably clear 3 minutes locally but not on GitHub
    // Actions' slower shared runners, making that version of this test
    // flaky for a CI gate without actually testing anything more.
    const statusBeforeEdit = await page.evaluate(() => window.__spelltilesTest.getStatus());
    await page.evaluate(() => {
      const textarea = [...document.querySelectorAll('#scad-form textarea')]
        .find((t) => t.closest('.oscw-field').querySelector('.oscw-label').textContent.includes('german'));
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, 'AB\nCD');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await waitForRenderThenReady(page, statusBeforeEdit, 30000);
    const model4 = await page.evaluate(() => window.__spelltilesTest.getLastModel());
    assert(!model4?.pregenUrl, 'an edited letter grid forces a live render, not a pregen hit');
    assert(model4?.parts?.length === 1 && model4.parts[0].off?.length > 1000, 'live Plate render of the edited grid produces real, non-trivial geometry');

    console.log('=== page errors ===');
    assert(pageErrors.length === 0, `no console errors/pageerrors during the whole run (got: ${JSON.stringify(pageErrors)})`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().then(() => {
  console.log(`\n${failures.length === 0 ? 'PASS' : 'FAIL'}: ${failures.length} failure(s)`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}).catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
