// Ports preview.html's offToIndexedMesh/crc32/buildZipStore/buildInlay3mf
// verbatim (Node has no DOM, but none of this needs one) to build the
// pregen inlay .3mf files the same way the live browser download does --
// keeps both paths byte-for-byte the same *scheme*, so there's only one
// "how do we make a two-color 3mf" implementation to keep correct.
import fs from 'node:fs';

function offToIndexedMesh(offText) {
  const lines = offText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  let i = 0;
  const hm = lines[i].match(/^C?OFF\s*(.*)/);
  if (!hm) return null;
  let countStr = hm[1].trim();
  i++;
  if (!countStr) countStr = lines[i++];
  const [nv, nf] = countStr.split(/\s+/).map(Number);
  if (!nv || !nf) return null;

  const vertices = [];
  for (let j = 0; j < nv; j++) vertices.push(lines[i++].split(/\s+/).map(Number).slice(0, 3));

  const triangles = [];
  for (let j = 0; j < nf; j++) {
    const p = lines[i++].split(/\s+/).map(Number);
    const n = p[0];
    const fv = p.slice(1, n + 1);
    for (let k = 1; k < fv.length - 1; k++) triangles.push([fv[0], fv[k], fv[k + 1]]);
  }
  return { vertices, triangles };
}

function crc32(bytes) {
  if (!crc32.table) {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    crc32.table = t;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = crc32.table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZipStore(files) {
  const enc = new TextEncoder();
  const localChunks = [], centralChunks = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    const size = data.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    localChunks.push(new Uint8Array(local.buffer), nameBytes, data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, 0, true);
    central.setUint16(14, 0, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, size, true);
    central.setUint32(24, size, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true);
    central.setUint16(32, 0, true);
    central.setUint16(34, 0, true);
    central.setUint16(36, 0, true);
    central.setUint32(38, 0, true);
    central.setUint32(42, offset, true);
    centralChunks.push(new Uint8Array(central.buffer), nameBytes);

    offset += 30 + nameBytes.length + size;
  }

  const centralStart = offset;
  const centralSize = centralChunks.reduce((a, c) => a + c.length, 0);

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(4, 0, true);
  end.setUint16(6, 0, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, centralStart, true);
  end.setUint16(20, 0, true);

  const allChunks = [...localChunks, ...centralChunks, new Uint8Array(end.buffer)];
  const out = new Uint8Array(allChunks.reduce((a, c) => a + c.length, 0));
  let pos = 0;
  for (const c of allChunks) { out.set(c, pos); pos += c.length; }
  return out;
}

function buildInlay3mf(baseOff, plugOff) {
  const base = offToIndexedMesh(baseOff);
  const plug = offToIndexedMesh(plugOff);
  const vOffset = base.vertices.length;
  const vertices = base.vertices.concat(plug.vertices);
  const triangles = [
    ...base.triangles.map(([a, b, c]) => [a, b, c, 0]),
    ...plug.triangles.map(([a, b, c]) => [a + vOffset, b + vOffset, c + vOffset, 1]),
  ];

  const vertexXml = vertices.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('\n');
  const triXml = triangles.map(([a, b, c, m]) => `<triangle v1="${a}" v2="${b}" v3="${c}" pid="1" p1="${m}"/>`).join('\n');

  const modelXml = `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" ` +
    `xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" unit="millimeter">\n` +
    `<resources><m:colorgroup id="1">` +
    `<m:color color="#DCDCDCFF"/>` +
    `<m:color color="#DC143CFF"/>` +
    `</m:colorgroup>` +
    `<object id="2" type="model" pid="1" pindex="0"><mesh>` +
    `<vertices>${vertexXml}</vertices><triangles>${triXml}</triangles>` +
    `</mesh></object></resources>` +
    `<build><item objectid="2"/></build></model>`;

  const contentTypes = `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `</Types>`;

  const rels = `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model" Id="rel0"/>` +
    `</Relationships>`;

  const enc = new TextEncoder();
  return buildZipStore([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: '3D/3dmodel.model', data: enc.encode(modelXml) },
  ]);
}

const [, , baseOffPath, plugOffPath, outPath] = process.argv;
const baseOff = fs.readFileSync(baseOffPath, 'utf8');
const plugOff = fs.readFileSync(plugOffPath, 'utf8');
const zipBytes = buildInlay3mf(baseOff, plugOff);
fs.writeFileSync(outPath, zipBytes);
console.log(`wrote ${outPath} (${zipBytes.length} bytes)`);
