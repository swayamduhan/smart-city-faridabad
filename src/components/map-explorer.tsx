"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import places from "@/data/places.json";
import { toggleSavedPlace } from "@/lib/actions";
import { distanceKm } from "@/lib/format";
import { CATEGORY_META, FBD_CENTER, MAP_STYLE, type Photon, type RouteResult, fetchRoute, loadMapLibre, locate, outsideCity, searchPhoton, tintBasemap } from "@/lib/map";
import type { Place, PlaceCategory } from "@/lib/types";

const ALL = places as Place[];
const CATS = Object.keys(CATEGORY_META) as PlaceCategory[];

type Selection = { kind: "place"; place: Place } | { kind: "geo"; geo: Photon };

const selLatLng = (s: Selection) => (s.kind === "place" ? s.place : s.geo);
const selName = (s: Selection) => (s.kind === "place" ? s.place.name : s.geo.name);

export function MapExplorer({ signedIn, savedPlaces }: { signedIn: boolean; savedPlaces: string[] }) {
  const params = useSearchParams();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const youMarker = useRef<Marker | null>(null);
  const pickMarker = useRef<Marker | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [geoHits, setGeoHits] = useState<Photon[]>([]);
  const [searchFailed, setSearchFailed] = useState(false);
  const [active, setActive] = useState<PlaceCategory | "all">((params.get("cat") as PlaceCategory) ?? "all");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [you, setYou] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const select = useCallback((s: Selection | null, fly = true) => {
    setSelection(s);
    setRoute(null);
    setRouteError(null);
    const map = mapRef.current;
    const lib = libRef.current;
    pickMarker.current?.remove();
    pickMarker.current = null;
    if (!s || !map || !lib) return;
    const at = selLatLng(s);
    pickMarker.current = new lib.Marker({ color: "#ffc72c" }).setLngLat([at.lng, at.lat]).addTo(map);
    if (fly) map.flyTo({ center: [at.lng, at.lat], zoom: Math.max(map.getZoom(), 15), speed: 1.4, essential: true });
    (map.getSource("route") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [] });
  }, []);

  // Boot the map once.
  useEffect(() => {
    if (!box.current || mapRef.current) return;
    let removed = false;
    (async () => {
      const lib = await loadMapLibre();
      if (removed || !box.current) return;
      libRef.current = lib;
      const map = new lib.Map({ container: box.current, style: MAP_STYLE, center: FBD_CENTER, zoom: 11.6, attributionControl: { compact: true } });
      mapRef.current = map;
      map.addControl(new lib.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("error", (e) => {
        if (!map.isStyleLoaded() && String(e.error?.message ?? "").match(/fetch|network|style/i)) setMapError(true);
      });
      map.on("load", () => {
        tintBasemap(map);
        map.addSource("places", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 34, clusterMaxZoom: 14 });
        map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": "#003d29", "line-width": 8 }, layout: { "line-cap": "round", "line-join": "round" } });
        map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": "#ffc72c", "line-width": 4 }, layout: { "line-cap": "round", "line-join": "round" } });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "places",
          filter: ["has", "point_count"],
          paint: { "circle-color": "#00603f", "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 40, 24], "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
        });
        map.addLayer({ id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13 }, paint: { "text-color": "#fff" } });
        map.addLayer({
          id: "points",
          type: "circle",
          source: "places",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["match", ["get", "category"], ...CATS.flatMap((c) => [c, CATEGORY_META[c].color]), "#000"] as never,
            "circle-radius": 7,
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });
        map.addLayer({ id: "point-names", type: "symbol", source: "places", minzoom: 14, filter: ["!", ["has", "point_count"]], layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true }, paint: { "text-color": "#0b2a20", "text-halo-color": "#fff", "text-halo-width": 1.4 } });

        map.on("click", "clusters", async (e) => {
          const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          const src = map.getSource("places") as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id);
          map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
        });
        map.on("click", "points", (e) => {
          const id = e.features?.[0]?.properties?.id;
          const p = ALL.find((x) => x.id === id);
          if (p) select({ kind: "place", place: p }, false);
        });
        for (const layer of ["clusters", "points"]) {
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }
        setReady(true);
      });
    })();
    return () => {
      removed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [select]);

  // Keep the pins in step with the chosen category.
  useEffect(() => {
    if (!ready) return;
    const rows = active === "all" ? ALL : ALL.filter((p) => p.category === active);
    (mapRef.current?.getSource("places") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: rows.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, category: p.category, name: p.name } })),
    });
  }, [ready, active]);

  // Deep links: /map?place=... and /map?q=... (once the map is ready).
  const deepLinked = useRef(false);
  useEffect(() => {
    if (!ready || deepLinked.current) return;
    deepLinked.current = true;
    const placeId = params.get("place");
    const p = placeId ? ALL.find((x) => x.id === placeId) : null;
    if (p) select({ kind: "place", place: p });
    const q = params.get("q");
    if (q) {
      searchPhoton(q)
        .then((hits) => {
          setGeoHits(hits);
          if (hits[0]) select({ kind: "geo", geo: hits[0] });
        })
        .catch(() => setSearchFailed(true));
    }
  }, [ready, params, select]);

  // Search as you type.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setGeoHits([]);
      setSearchFailed(false);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      searchPhoton(term, ctl.signal)
        .then((hits) => {
          setGeoHits(hits);
          setSearchFailed(false);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setSearchFailed(true);
        });
    }, 280);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query]);

  const findMe = async () => {
    setLocating(true);
    setLocError(null);
    try {
      const pos = await locate();
      setYou(pos);
      const map = mapRef.current;
      const lib = libRef.current;
      if (map && lib) {
        youMarker.current?.remove();
        const el = document.createElement("div");
        el.className = "you-dot";
        el.setAttribute("aria-label", "Your location");
        youMarker.current = new lib.Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(map);
        if (outsideCity(pos)) setLocError("You seem to be outside Faridabad. Your location is marked, but the map stays on the city.");
        else map.flyTo({ center: [pos.lng, pos.lat], zoom: 14, essential: true });
      }
    } catch (e) {
      setLocError((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  const directions = async () => {
    if (!selection) return;
    setRouting(true);
    setRouteError(null);
    try {
      let from = you;
      if (!from) {
        from = await locate();
        setYou(from);
      }
      const r = await fetchRoute(from, selLatLng(selection));
      setRoute(r);
      const map = mapRef.current;
      (map?.getSource("route") as GeoJSONSource | undefined)?.setData({ type: "Feature", geometry: { type: "LineString", coordinates: r.geometry }, properties: {} });
      if (map && libRef.current) {
        const bounds = r.geometry.reduce((b, c) => b.extend(c), new libRef.current.LngLatBounds(r.geometry[0], r.geometry[0]));
        map.fitBounds(bounds, { padding: 70 });
      }
    } catch (e) {
      setRouteError((e as Error).message);
    } finally {
      setRouting(false);
    }
  };

  const term = query.trim().toLowerCase();
  const list = useMemo(() => {
    let rows = active === "all" ? ALL : ALL.filter((p) => p.category === active);
    if (term.length >= 2) rows = rows.filter((p) => p.name.toLowerCase().includes(term) || p.address?.toLowerCase().includes(term) || p.cuisine?.toLowerCase().includes(term));
    if (you) rows = [...rows].sort((a, b) => distanceKm(you, a) - distanceKm(you, b));
    return rows.slice(0, 40);
  }, [active, term, you]);

  return (
    <div className="grid h-[calc(100svh-3.5rem-4rem)] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(40%,1fr)_auto] lg:h-[calc(100svh-3.5rem)] lg:grid-cols-[400px_1fr] lg:grid-rows-1">
      <aside className="order-2 flex min-h-0 max-h-[58svh] flex-col border-r-2 border-line bg-plate lg:order-1 lg:max-h-none">
        <div className="border-b border-line p-4">
          <label className="label" htmlFor="map-search">
            Find a place or address
          </label>
          <input id="map-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Badkhal Lake, Sector 15, a hospital" className="field" autoComplete="off" />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={findMe} disabled={locating} className="btn btn-mark !min-h-10">
              {locating ? "Finding you" : "Show my location"}
            </button>
            {you && !locError && <span className="text-[0.92rem] text-muted">Nearest places listed first</span>}
          </div>
          {locError && (
            <p role="alert" className="mt-2 text-[0.95rem] font-semibold text-alert">
              {locError}
            </p>
          )}
          <div className="scroll-x -mx-4 mt-3 flex gap-1.5 px-4" role="group" aria-label="Filter places">
            <button type="button" className="filter !min-h-9 text-[0.92rem]" aria-pressed={active === "all"} onClick={() => setActive("all")}>
              All
            </button>
            {CATS.map((c) => (
              <button key={c} type="button" className="filter flex !min-h-9 items-center gap-1.5 text-[0.92rem]" aria-pressed={active === c} onClick={() => setActive(c)}>
                <span className="size-2.5 rounded-full ring-1 ring-white" style={{ background: CATEGORY_META[c].color }} aria-hidden="true" />
                {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {selection && (
            <SelectionCard
              selection={selection}
              signedIn={signedIn}
              saved={selection.kind === "place" && savedPlaces.includes(selection.place.id)}
              you={you}
              route={route}
              routing={routing}
              routeError={routeError}
              onDirections={directions}
              onClose={() => select(null)}
            />
          )}

          {term.length >= 3 && geoHits.length > 0 && (
            <section aria-label="Addresses">
              <h2 className="px-4 pt-3 text-[0.92rem] font-bold text-muted">Addresses and areas</h2>
              <ul>
                {geoHits.map((g, i) => (
                  <li key={`${g.name}${i}`}>
                    <button type="button" className="row-link w-full px-4 py-2 text-left" onClick={() => select({ kind: "geo", geo: g })}>
                      <span className="font-semibold">{g.name}</span>
                      {g.detail && <span className="block text-[0.92rem] text-muted">{g.detail}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {searchFailed && <p className="px-4 pt-3 text-[0.95rem] text-muted">Address search isn&apos;t responding, so only places saved in this site are shown.</p>}

          <section aria-label="Places">
            <h2 className="px-4 pt-3 text-[0.92rem] font-bold text-muted">{list.length === 40 ? "Top 40 places" : `${list.length} place${list.length === 1 ? "" : "s"}`}</h2>
            <ul className="pb-3">
              {list.map((p) => (
                <li key={p.id}>
                  <button type="button" className="row-link flex w-full items-start gap-2.5 px-4 py-2 text-left" onClick={() => select({ kind: "place", place: p })}>
                    <span className="mt-[0.45rem] size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_META[p.category].color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{p.name}</span>
                      <span className="block truncate text-[0.92rem] text-muted">{p.cuisine ?? p.address ?? CATEGORY_META[p.category].label}</span>
                    </span>
                    {you && <span className="shrink-0 text-[0.92rem] tabular-nums text-muted">{distanceKm(you, p).toFixed(1)} km</span>}
                  </button>
                </li>
              ))}
            </ul>
            {list.length === 0 && <p className="px-4 pb-4 text-muted">No saved places match. Check the address results above, or clear the filter.</p>}
          </section>
        </div>
      </aside>

      <div className="relative order-1 min-h-0 lg:order-2">
        {/* MapLibre's stylesheet forces position: relative on the map element, so the wrapper does the pinning. */}
        <div className="absolute inset-0">
          <div ref={box} className="size-full" data-lenis-prevent />
        </div>
        {mapError && (
          <div className="absolute inset-0 grid place-items-center bg-ground p-6 text-center">
            <p className="max-w-[40ch]">
              The map couldn&apos;t load. Check your internet connection and reload. You can still browse the <Link href="/places" className="link font-semibold">list of places</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectionCard({ selection, signedIn, saved: initiallySaved, you, route, routing, routeError, onDirections, onClose }: { selection: Selection; signedIn: boolean; saved: boolean; you: { lat: number; lng: number } | null; route: RouteResult | null; routing: boolean; routeError: string | null; onDirections: () => void; onClose: () => void }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, start] = useTransition();
  useEffect(() => setSaved(initiallySaved), [initiallySaved, selection]);
  const place = selection.kind === "place" ? selection.place : null;
  const at = selLatLng(selection);

  return (
    <section aria-label={`Details for ${selName(selection)}`} className="on-sign border-b-2 border-ink bg-sign p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {place?.nameHi && <p className="hi">{place.nameHi}</p>}
          <h2 className="display text-2xl">{selName(selection)}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 font-semibold hover:bg-white/15" aria-label="Close details">
          Close
        </button>
      </div>
      <dl className="mt-2 grid gap-0.5 text-[0.98rem]">
        {place && <dd>{[CATEGORY_META[place.category].label, place.cuisine].filter(Boolean).join(", ")}</dd>}
        {place?.address && <dd>{place.address}</dd>}
        {selection.kind === "geo" && selection.geo.detail && <dd>{selection.geo.detail}</dd>}
        {place?.hours && <dd>Hours: {place.hours}</dd>}
        {place?.phone && (
          <dd>
            <a className="link" href={`tel:${place.phone.replace(/[^+\d]/g, "")}`}>
              {place.phone}
            </a>
          </dd>
        )}
        {place?.website && (
          <dd className="truncate">
            <a className="link" href={/^https?:\/\//i.test(place.website) ? place.website : `https://${place.website}`} target="_blank" rel="noreferrer">
              Website
            </a>
          </dd>
        )}
        {you && !route && <dd>{distanceKm(you, at).toFixed(1)} km away in a straight line</dd>}
      </dl>
      {route && (
        <p className="led mt-2 text-2xl" role="status">
          {route.distanceKm.toFixed(1)} km, about {Math.round(route.minutes)} min by road
        </p>
      )}
      {routeError && (
        <p role="alert" className="mt-2 font-semibold text-mark">
          {routeError}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onDirections} disabled={routing} className="btn btn-mark !min-h-10">
          {routing ? "Finding a route" : "Get directions"}
        </button>
        {place &&
          (signedIn ? (
            <button
              type="button"
              disabled={pending}
              className="btn btn-line !min-h-10"
              aria-pressed={saved}
              onClick={() =>
                start(async () => {
                  const res = await toggleSavedPlace(place.id);
                  if (res.ok) setSaved(res.data.saved);
                })
              }
            >
              {saved ? "Saved" : "Save place"}
            </button>
          ) : (
            <Link href="/login?next=/map" className="btn btn-line !min-h-10">
              Sign in to save
            </Link>
          ))}
      </div>
    </section>
  );
}
