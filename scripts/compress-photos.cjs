// Resizes the downloaded photos so they stay light as web images and shader textures.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const creditsPath = 'src/data/photo-credits.json';
const credits = JSON.parse(fs.readFileSync(creditsPath, 'utf8'));

(async () => {
  for (const [slug, c] of Object.entries(credits)) {
    const input = path.join('public', c.file);
    const buf = fs.readFileSync(input);
    const out = await sharp(buf).rotate().resize({ width: 1800, withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    fs.unlinkSync(input);
    fs.writeFileSync(path.join('public/images', slug + '.jpg'), out.data);
    c.file = `/images/${slug}.jpg`;
    c.width = out.info.width;
    c.height = out.info.height;
    console.log(slug, out.info.width, out.info.height, Math.round(out.data.length / 1024) + 'kb');
  }
  fs.writeFileSync(creditsPath, JSON.stringify(credits, null, 2));
})();
