const fs = require('fs');
const path = require('path');

const imgPath = path.join(process.cwd(), 'logo.png');
if (!fs.existsSync(imgPath)) {
  console.error('❌ logo.png not found!');
  process.exit(1);
}

const pngBuffer = fs.readFileSync(imgPath);

// Construct genuine Windows ICO header + directory entry
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // ICO format
header.writeUInt16LE(1, 4); // 1 Image count

const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // Width 256px
entry.writeUInt8(0, 1); // Height 256px
entry.writeUInt8(0, 2); // Palette
entry.writeUInt8(0, 3); // Reserved
entry.writeUInt16LE(1, 4); // Planes
entry.writeUInt16LE(32, 6); // 32 Bits per pixel
entry.writeUInt32LE(pngBuffer.length, 8); // PNG byte length
entry.writeUInt32LE(22, 12); // Offset to image data (6+16=22)

const icoData = Buffer.concat([header, entry, pngBuffer]);

if (!fs.existsSync('build')) fs.mkdirSync('build');
fs.writeFileSync('build/icon.ico', icoData);
fs.writeFileSync('icon.ico', icoData);

console.log('✅ Real Windows icon.ico generated successfully without NPX!');
