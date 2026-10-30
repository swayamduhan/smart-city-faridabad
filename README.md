# Faridabad, in one place

A smart city website for Faridabad, built as a college demo. It isn't an official government service, and no real money moves.

## Run it

Needs Node.js 20 or newer. Maps, address search, directions and weather need an internet connection.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. For the smoothest presentation, use the production build:

```bash
npm run build
npm start
```

## Demo accounts

Go to **Sign in** and use the one-click buttons, or enter these details:

| Account | Email | Password |
|---|---|---|
| Citizen | citizen@faridabad.demo | demo1234 |
| Admin | admin@faridabad.demo | demo1234 |

## A good order to show it

1. **Home:** search for "water bill", then scroll through the shader tour and the sticky gallery.
2. **Pay bills:** use a sample number and pay with `fail@upi` to show a declined payment. Then pay with any other UPI ID and open the receipt.
3. **Report a problem:** take a photo, use your location and send the report.
4. **Admin:** sign in as the demo admin, open **Citizen reports**, and update that report. Its tracking page changes straight away.
5. **Bus and metro:** watch the arrivals board and the moving vehicles.
6. **Any footer:** run the mouse across the giant FARIDABAD sign to break it, then report the damage.

## What's real and what's simulated

| Part | Source |
|---|---|
| Map, address search, directions | OpenFreeMap, Photon and OSRM, all live |
| Schools, hospitals, parks, cafes, food spots | Real places from OpenStreetMap, saved in `src/data/places.json` |
| Weather and air quality | Open-Meteo, live and modelled |
| Metro stations and line | Real, from OpenStreetMap |
| Metro times, bus routes, seats, vehicle positions | Simulated from the clock, because no public feed exists |
| Bills and payments | Simulated |
| Ward candidates, projects, notices, sample reports | Invented, including every person's name |
| Jobs | Invented, unless you add an Adzuna key (below) |
| City facts | 2011 census and press reports, see `/credits` |

Photo credits and licences are on the `/credits` page. Keep that page if you reuse the photos.

## Useful commands

| Command | What it does |
|---|---|
| `npm run data:reset` | Clears everything people added and restores the sample data. Works while the server runs |
| `npm run data:osm` | Downloads a fresh copy of the places and metro data |

## Optional: real job listings

Create a free key at [developer.adzuna.com](https://developer.adzuna.com), then add it to a `.env.local` file. Listings then appear alongside the sample jobs. This path hasn't been tested with a real key.

```
ADZUNA_APP_ID=your_id
ADZUNA_APP_KEY=your_key
```

## Things to know

- **Phones on the same Wi-Fi:** the browser only allows the live camera and location on `localhost` or HTTPS. Over a plain network address, use **Choose a photo** and tap the map instead.
- **Hosting:** data lives in the `.data` folder on the machine running the site. Hosts with temporary storage, such as Vercel, won't keep it. Set `SESSION_SECRET` if you ever host it.

## Built with

Next.js, TypeScript, Tailwind CSS, Motion, Lenis, Matter.js, MapLibre and hand-written WebGL. Accounts use signed cookies and hashed passwords, and data lives in a JSON file.
