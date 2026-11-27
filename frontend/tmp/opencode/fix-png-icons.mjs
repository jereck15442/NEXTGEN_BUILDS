import fs from 'node:fs';
import zlib from 'node:zlib';

const files = [
  'public/icons/icon-192x192.png',
  'public/icons/icon-512x512.png',
  'public/icons/maskable-icon-512x512.png',
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBytes = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

for (const file of files) {
  const original = fs.readFileSync(file);
  const chunks = [];
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset + 12 <= original.length) {
    const length = original.readUInt32BE(offset);
    const type = original.toString('ascii', offset + 4, offset + 8);
    const data = original.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === 'IDAT') idat.push(data);
    if (type !== 'IDAT') chunks.push(chunk(type, data));
    offset += 12 + length;
    if (type === 'IEND') break;
  }

  const raw = zlib.inflateRawSync(Buffer.concat(idat));
  const expected = height * (1 + width * 4);
  if (bitDepth !== 8 || colorType !== 6 || raw.length !== expected) {
    throw new Error(`${file}: unexpected image format or raw length ${raw.length} != ${expected}`);
  }

  const fixedIdat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const ihdrIndex = chunks.findIndex((item) => item.toString('ascii', 4, 8) === 'IHDR');
  const iendIndex = chunks.findIndex((item) => item.toString('ascii', 4, 8) === 'IEND');
  const rebuilt = Buffer.concat([
    original.subarray(0, 8),
    ...chunks.slice(0, ihdrIndex + 1),
    fixedIdat,
    ...chunks.slice(ihdrIndex + 1, iendIndex),
    chunks[iendIndex],
  ]);

  fs.writeFileSync(file, rebuilt);
  const check = zlib.inflateSync(rebuilt.subarray(
    rebuilt.indexOf(Buffer.from('IDAT')) + 4,
    rebuilt.indexOf(Buffer.from('IDAT')) + 4 + rebuilt.readUInt32BE(rebuilt.indexOf(Buffer.from('IDAT')) - 4)
  ));
  console.log(`${file}: ${width}x${height}, ${original.length} -> ${rebuilt.length} bytes, zlib decode ${check.length} bytes`);
}
