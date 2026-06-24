const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const svg = fs.readFileSync(path.join(__dirname, 'og-image.svg'));
sharp(svg, { density: 144 })
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(path.join(__dirname, '..', 'og-image.png'))
  .then((info) => console.log('og-image.png', info.width + 'x' + info.height, info.size + ' bytes'))
  .catch((e) => { console.error(e); process.exit(1); });
