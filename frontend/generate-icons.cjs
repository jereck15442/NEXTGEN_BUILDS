const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'public', 'icons');

function writePNG(filePath, width, height, colorRects) {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // Create raw image data (RGBA)
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(rowBytes * height, 0);

  // Fill background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * rowBytes) + (x * 4);
      // Default background: deep navy
      rawData[offset] = 0x10;     // R
      rawData[offset + 1] = 0x18; // G
      rawData[offset + 2] = 0x27; // B
      rawData[offset + 3] = 0xFF; // A
    }
  }

  // Draw color rectangles
  colorRects.forEach(({ x, y, w, h, r, g, b }) => {
    for (let py = y; py < y + h && py < height; py++) {
      for (let px = x; px < x + w && px < width; px++) {
        const offset = (py * rowBytes) + (px * 4);
        rawData[offset] = r;
        rawData[offset + 1] = g;
        rawData[offset + 2] = b;
        rawData[offset + 3] = 0xFF;
      }
    }
  });

  // Filter: none (filter type 0 for each row)
  const filteredData = Buffer.alloc(rawData.length + height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    filteredData[offset++] = 0; // filter type: none
    rawData.copy(filteredData, offset, y * rowBytes, (y + 1) * rowBytes);
    offset += rowBytes;
  }

  // PNG IDAT requires a zlib-wrapped deflate stream, not raw deflate.
  const compressed = zlib.deflateSync(filteredData);

  // Build chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcInput = Buffer.concat([typeBuf, data]);
    // CRC32 implementation using unsigned right shift
    let crcValue = 0xFFFFFFFF;
    for (let i = 0; i < crcInput.length; i++) {
      crcValue ^= crcInput[i];
      for (let j = 0; j < 8; j++) {
        crcValue = (crcValue >>> 1) ^ (0xEDB88320 & -(crcValue & 1));
      }
      crcValue = crcValue >>> 0; // keep as unsigned 32-bit
    }
    const crcUnsigned = (crcValue ^ 0xFFFFFFFF) >>> 0;
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcUnsigned, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const pngBuffer = Buffer.concat([PNG_SIGNATURE, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Created ${filePath} (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
}

// icon-192x192.png
writePNG(
  path.join(iconsDir, 'icon-192x192.png'),
  192, 192,
  [
    { x: 0, y: 0, w: 192, h: 192, r: 0x10, g: 0x18, b: 0x27 }, // background
    { x: 64, y: 64, w: 64, h: 8, r: 0x25, g: 0x63, b: 0xEB },   // accent bar
    { x: 48, y: 80, w: 96, h: 8, r: 0x06, g: 0xB6, b: 0xD4 },   // highlight bar
    { x: 32, y: 104, w: 128, h: 8, r: 0x25, g: 0x63, b: 0xEB }, // accent bar
  ]
);

// icon-512x512.png
writePNG(
  path.join(iconsDir, 'icon-512x512.png'),
  512, 512,
  [
    { x: 0, y: 0, w: 512, h: 512, r: 0x10, g: 0x18, b: 0x27 },
    { x: 160, y: 160, w: 192, h: 24, r: 0x25, g: 0x63, b: 0xEB },
    { x: 128, y: 208, w: 256, h: 24, r: 0x06, g: 0xB6, b: 0xD4 },
    { x: 80, y: 272, w: 352, h: 24, r: 0x25, g: 0x63, b: 0xEB },
  ]
);

// maskable-icon-512x512.png (same as 512x512 but for maskable)
writePNG(
  path.join(iconsDir, 'maskable-icon-512x512.png'),
  512, 512,
  [
    { x: 0, y: 0, w: 512, h: 512, r: 0x10, g: 0x18, b: 0x27 },
    { x: 160, y: 160, w: 192, h: 24, r: 0x25, g: 0x63, b: 0xEB },
    { x: 128, y: 208, w: 256, h: 24, r: 0x06, g: 0xB6, b: 0xD4 },
    { x: 80, y: 272, w: 352, h: 24, r: 0x25, g: 0x63, b: 0xEB },
  ]
);

console.log('All icons generated successfully!');