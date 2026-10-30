// Takes a snapshot of Faridabad's places, metro line and road geometry from OpenStreetMap,
// so the site stays fast and works offline during a demo. Re-run with `npm run data:osm`.
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const UA = 'smart-city-faridabad-demo/0.1 (college project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BBOX = '28.33,77.25,28.50,77.37';

const CACHE = '.cache/overpass';
fs.mkdirSync(CACHE, { recursive: true });
const HOSTS = ['https://overpass-api.de', 'https://maps.mail.ru/osm/tools/overpass', 'https://overpass.private.coffee', 'https://overpass.kumi.systems'];

// Public Overpass servers are often busy, so each answer is cached and failed queries retry with a pause.
async function overpass(q) {
  const key = `${CACHE}/${createHash('sha1').update(q).digest('hex')}.json`;
  if (fs.existsSync(key)) return JSON.parse(fs.readFileSync(key, 'utf8'));
  for (let round = 0; round < 6; round++) {
    for (const host of HOSTS) {
      try {
        const r = await fetch(host + '/api/interpreter', {
          method: 'POST',
          headers: { 'User-Agent': UA, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: q }),
          signal: AbortSignal.timeout(75000),
        });
        if (r.ok) {
          const j = await r.json();
          fs.writeFileSync(key, JSON.stringify(j));
          return j;
        }
        console.log('overpass', host, r.status);
      } catch (e) {
        console.log('overpass', host, e.message);
      }
      await sleep(3000);
    }
    await sleep(30000);
  }
  throw new Error('overpass failed');
}

const CATEGORIES = {
  schools: ['nwr["amenity"="school"]', 'nwr["amenity"="college"]', 'nwr["amenity"="university"]'],
  hospitals: ['nwr["amenity"="hospital"]', 'nwr["amenity"="clinic"]'],
  parks: ['nwr["leisure"="park"]', 'nwr["leisure"="garden"]', 'nwr["tourism"="attraction"]'],
  cafes: ['nwr["amenity"="cafe"]'],
  food: ['nwr["amenity"="restaurant"]', 'nwr["amenity"="fast_food"]'],
};

function address(t) {
  const parts = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'] || t['addr:neighbourhood'], t['addr:postcode']].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

const places = [];
for (const [category, selectors] of Object.entries(CATEGORIES)) {
  const q = `[out:json][timeout:60];(${selectors.map((s) => `${s}["name"](${BBOX});`).join('')});out center tags;`;
  const j = await overpass(q);
  const seen = new Set();
  for (const e of j.elements) {
    const t = e.tags || {};
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    const key = (t.name || '').toLowerCase();
    if (!lat || !t.name || seen.has(key)) continue;
    seen.add(key);
    places.push({
      id: `${e.type[0]}${e.id}`,
      category,
      name: t.name,
      nameHi: t['name:hi'],
      lat: +lat.toFixed(5),
      lng: +lng.toFixed(5),
      kind: t.amenity || t.leisure || t.tourism,
      address: address(t),
      phone: t.phone || t['contact:phone'],
      website: t.website || t['contact:website'],
      hours: t.opening_hours,
      cuisine: t.cuisine?.replace(/;/g, ', ').replace(/_/g, ' '),
      emergency: t.emergency === 'yes' || undefined,
    });
  }
  console.log(category, places.filter((p) => p.category === category).length);
  await sleep(4000);
}
fs.writeFileSync('src/data/places.json', JSON.stringify(places));

// Metro: Violet Line stations are real; order runs from the Delhi border down to Ballabhgarh.
const STATIONS = ['Sarai', 'NHPC Chowk', 'Mewala Maharajpur', 'Sector 28', 'Badkhal Mor', 'Old Faridabad', 'Neelam Chowk Ajronda', 'Bata Chowk', 'Escorts Mujesar', 'Sant Surdas', 'Raja Nahar Singh'];
const st = await overpass(`[out:json][timeout:60];node["railway"="stop"]["network"="Delhi Metro"](${BBOX});out;`);
await sleep(4000);
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const ALIASES = {
  'Mewala Maharajpur': ['mewlamaharajpur', 'mewalamaharajpur'],
  'Badkhal Mor': ['badkhalmor', 'badhkalmor'],
  'Sant Surdas': ['santsurdas', 'santsurdassihi'],
  'Neelam Chowk Ajronda': ['neelamchowkajronda'],
  'Raja Nahar Singh': ['rajanaharsingh', 'rajanaharsinghballabhgarh'],
};
const stations = STATIONS.map((name) => {
  const wants = ALIASES[name] || [norm(name)];
  const hit = st.elements.find((e) => e.tags?.name && wants.some((w) => norm(e.tags.name).startsWith(w)));
  if (!hit) console.log('NO STATION MATCH', name);
  return hit ? { name, nameHi: hit.tags['name:hi'], lat: +hit.lat.toFixed(5), lng: +hit.lon.toFixed(5) } : { name };
});

const line = await overpass(`[out:json][timeout:60];relation["route"="subway"]["name"~"Violet",i](${BBOX});out geom;`);
const lineWays = [];
for (const rel of line.elements.slice(0, 1)) {
  for (const m of rel.members) {
    if (m.type === 'way' && m.geometry && !m.role) lineWays.push(m.geometry.map((g) => [+g.lon.toFixed(5), +g.lat.toFixed(5)]));
  }
}
console.log('violet ways', lineWays.length, 'relations', line.elements.length);

// Bus routes are simulated (no public feed exists), but they follow real roads via OSRM.
// Stop positions are pinned by hand: geocoding sector names proved unreliable.
const STOPS = {
  'Ballabhgarh Bus Stand': [77.3218, 28.3428], 'Sant Surdas (Sihi)': [77.31623, 28.35465], 'Escorts Mujesar': [77.31492, 28.37023], 'Bata Chowk': [77.31343, 28.38594],
  'Neelam Chowk': [77.31236, 28.39766], 'Old Faridabad': [77.31142, 28.41089], 'Badkhal Mor': [77.31038, 28.42271], 'Sector 28': [77.30901, 28.43816], 'NHPC Chowk': [77.30739, 28.45778], 'Badarpur Border': [77.30226, 28.49411],
  'NIT 5': [77.30235, 28.39967], 'NIT 2': [77.28829, 28.38409], 'Sector 15': [77.3231, 28.39836], 'Sector 16': [77.32233, 28.40904], 'Sector 21A': [77.29982, 28.42318], 'Sector 21C': [77.29561, 28.43016], 'Sector 46': [77.30062, 28.44092], 'Surajkund': [77.28301, 28.48367],
  'Sector 12': [77.32324, 28.38555], 'Sector 14': [77.33157, 28.39369], 'Sector 79': [77.35739, 28.38087], 'Sector 88': [77.35426, 28.41572], 'Sector 7': [77.32578, 28.36174], 'Sector 8': [77.33384, 28.36321], 'Tigaon': [77.39653, 28.35089],
};
const geocode = async (name) => STOPS[name];

const ROUTES = [
  { id: '101', name: 'Ballabhgarh to Badarpur Border', stops: ['Ballabhgarh Bus Stand', 'Sant Surdas (Sihi)', 'Escorts Mujesar', 'Bata Chowk', 'Neelam Chowk', 'Old Faridabad', 'Badkhal Mor', 'Sector 28', 'NHPC Chowk', 'Badarpur Border'] },
  { id: '205', name: 'NIT 2 to Sector 21C', stops: ['NIT 2', 'NIT 5', 'Neelam Chowk', 'Sector 15', 'Sector 16', 'Sector 21C'] },
  { id: '307', name: 'Old Faridabad to Surajkund', stops: ['Old Faridabad', 'Sector 21A', 'Sector 21C', 'Sector 46', 'Surajkund'] },
  { id: '412', name: 'Bata Chowk to Greater Faridabad', stops: ['Bata Chowk', 'Sector 12', 'Sector 14', 'Sector 79', 'Sector 88'] },
  { id: '518', name: 'Ballabhgarh to Tigaon', stops: ['Ballabhgarh Bus Stand', 'Sector 7', 'Sector 8', 'Tigaon'] },
];

const routes = [];
for (const r of ROUTES) {
  const coords = [];
  for (const s of r.stops) coords.push(await geocode(s));
  const usable = r.stops.map((name, i) => ({ name, c: coords[i] })).filter((s) => s.c);
  const u = `https://router.project-osrm.org/route/v1/driving/${usable.map((s) => s.c.map((n) => n.toFixed(5)).join(',')).join(';')}?overview=full&geometries=geojson`;
  const j = await (await fetch(u, { headers: { 'User-Agent': UA } })).json();
  await sleep(1500);
  const route = j.routes[0];
  let run = 0;
  const stops = usable.map((s, i) => {
    const o = { name: s.name, lat: +s.c[1].toFixed(5), lng: +s.c[0].toFixed(5), atSec: Math.round(run) };
    run += route.legs[i]?.duration ?? 0;
    return o;
  });
  routes.push({
    id: r.id,
    name: r.name,
    durationSec: Math.round(route.duration),
    distanceM: Math.round(route.distance),
    stops,
    geometry: route.geometry.coordinates.map((p) => [+p[0].toFixed(5), +p[1].toFixed(5)]),
  });
  console.log(r.id, Math.round(route.distance / 1000) + 'km', Math.round(route.duration / 60) + 'min', 'stops', usable.length, 'pts', route.geometry.coordinates.length);
}
fs.writeFileSync('src/data/transit.json', JSON.stringify({ stations, lineWays, routes }));
console.log(JSON.stringify(stations));
