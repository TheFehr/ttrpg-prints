// `new Worker(url)` requires a same-origin script URL -- unlike a page's own
// `<script type="module">`, which can load a cross-origin module fine
// (subject to CORS), that restriction applies specifically to the initial
// Worker construction, not to what the worker's module goes on to import.
// This same-origin local file's only job is to import the library's real
// worker from the CDN -- a normal cross-origin ES module import, which is
// allowed -- so its top-level code (self.onmessage, etc.) runs in this
// worker's global scope. worker.js's own internal relative import
// (`./text-glyphs.js`) still resolves against *its own* module URL (the CDN
// path), not this shim's, so it's unaffected.
import 'https://cdn.jsdelivr.net/npm/openscad-customizer-web@0.3.0/dist/worker.js';
