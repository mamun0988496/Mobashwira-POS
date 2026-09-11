const fs = require('fs');
const path = require('path');

async function makeIco() {
  const pngPath = path.join(process.cwd(), 'logo.png');
  const pngBuffer = fs.readFileSync(pngPath);
  
  // Create valid Windows ICO container wrapping PNG data
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(1, 4); // 1 Image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // 0 = 256px width
  entry.writeUInt8(0, 1); // 0 = 256px height
  entry.writeUInt8(0, 2); // Color palette
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of PNG data
  entry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
  fs.writeFileSync('icon.ico', icoBuffer);
  console.log('✅ icon.ico successfully generated');
}

makeIco();
