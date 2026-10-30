// Downloads the freely licensed Faridabad photos from Wikimedia Commons and records their credits.
import fs from 'node:fs';
const UA = 'smart-city-faridabad-demo/0.1 (college project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PHOTOS = {
  palace: 'Nahar Singh Palace, Ballabhgarh.jpg',
  kund: 'Suraj Kund Masonary 044.jpg',
  kundsteps: 'Suraj Kund Masonary 074.jpg',
  sign: '"Aao Surajkund Chale" Surajkund Fair 2019.jpg',
  lamps: 'Surajkund mela.jpg',
  metro: 'Faridabad Old metro station.jpg',
  skyway: 'Delhi Faridabad Skyway.png',
  street: 'Faridabad Street.JPG',
  badkhal: 'Dried Badkhal lake.jpg',
  charminar: 'Charminar "Surajkund".jpg',
  folk: 'Pothuraju Artist in Culture of Telangana Programme at Surajkund, Haryana (02.02.2016) 07.jpg',
  station: 'Ballabgarh railway station.jpg',
};
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const credits = {};
for (const [slug, title] of Object.entries(PHOTOS)) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', format: 'json', titles: 'File:' + title, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '2000' });
  const j = await (await fetch(u, { headers: { 'User-Agent': UA } })).json();
  const p = Object.values(j.query.pages)[0];
  const i = p.imageinfo[0];
  const src = i.width > 2000 ? i.thumburl : i.url;
  const ext = /\.png$/i.test(new URL(src).pathname) ? 'png' : 'jpg';
  let r;
  for (let a = 0; a < 5; a++) {
    r = await fetch(src, { headers: { 'User-Agent': UA } });
    if (r.ok) break;
    console.log('retry', slug, r.status);
    await sleep(20000);
  }
  if (!r.ok) throw new Error('failed ' + slug);
  fs.writeFileSync(`../public/images/${slug}.${ext}`, Buffer.from(await r.arrayBuffer()));
  const m = i.extmetadata;
  credits[slug] = { file: `/images/${slug}.${ext}`, title, width: Math.min(i.width, 2000), height: Math.round((i.height * Math.min(i.width, 2000)) / i.width), artist: strip(m.Artist?.value).slice(0, 60), license: m.LicenseShortName?.value, licenseUrl: m.LicenseUrl?.value, page: i.descriptionurl };
  console.log(slug, ext, credits[slug].width, credits[slug].height, credits[slug].license, '|', credits[slug].artist);
  await sleep(5000);
}
fs.writeFileSync('../src/data/photo-credits.json', JSON.stringify(credits, null, 2));
