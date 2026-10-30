"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { FBD_CENTER, MAP_STYLE, loadMapLibre, tintBasemap } from "@/lib/map";
import { ALL_STOPS, DIRECTION_LABEL, LINE_WAYS, ROUTES, STATIONS, arrivalsAtStop, busesOn, metroArrivals, metroTrains } from "@/lib/transit-sim";

function useClock(ms = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const mins = (m: number) => (m <= 0 ? "Due" : `${m} min`);

export function TransitLive() {
  const now = useClock();
  const [station, setStation] = useState(5);
  const [stop, setStop] = useState("Neelam Chowk");
  const [routeId, setRouteId] = useState<string | "all">("all");

  const arrivals = useMemo(() => (now ? metroArrivals(station, now, 2) : []), [now, station]);
  const stopArrivals = useMemo(() => (now ? arrivalsAtStop(stop, now).slice(0, 5) : []), [now, stop]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="grid content-start gap-8">
        <section aria-labelledby="metro-h">
          <h2 id="metro-h" className="display text-3xl">
            Metro arrivals
          </h2>
          <label className="label mt-3" htmlFor="station">
            Station
          </label>
          <select id="station" value={station} onChange={(e) => setStation(Number(e.target.value))} className="field">
            {STATIONS.map((s, i) => (
              <option key={s.name} value={i}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="board mt-3 px-4 pb-3 pt-4" aria-live="off">
            <div className="led mb-1 flex justify-between text-base opacity-70 sm:text-lg">
              <span>Towards</span>
              <span>Arrives</span>
            </div>
            {arrivals.map((a) => (
              <div key={`${a.direction}${a.tripId}`} className="flex items-baseline justify-between gap-3 border-t border-white/10 py-1">
                <span className="led min-w-0 truncate text-xl sm:text-[1.7rem]">{DIRECTION_LABEL[a.direction]}</span>
                <span className="flex items-baseline gap-3">
                  <span className="hidden text-[0.9rem] text-white/70 sm:inline">{a.load}</span>
                  <span className="led whitespace-nowrap text-xl tabular-nums sm:text-[1.7rem]">{a.minutes === 0 ? `${a.seconds}s` : `${a.minutes} min`}</span>
                </span>
              </div>
            ))}
            {!now && <p className="led text-xl">Loading times</p>}
          </div>
        </section>

        <section aria-labelledby="bus-h">
          <h2 id="bus-h" className="display text-3xl">
            Next buses
          </h2>
          <label className="label mt-3" htmlFor="stop">
            Your stop
          </label>
          <select id="stop" value={stop} onChange={(e) => setStop(e.target.value)} className="field">
            {ALL_STOPS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="board mt-3 px-4 pb-3 pt-4">
            <div className="led mb-1 grid grid-cols-[3.2rem_1fr_auto] gap-3 text-base opacity-70 sm:text-lg">
              <span>Bus</span>
              <span>Towards</span>
              <span>Arrives</span>
            </div>
            {stopArrivals.map((a, i) => (
              <div key={`${a.routeId}${i}`} className="grid grid-cols-[3.2rem_1fr_auto] items-baseline gap-3 border-t border-white/10 py-1">
                <span className="led text-xl sm:text-[1.7rem]">{a.routeId}</span>
                <span className="min-w-0">
                  <span className="led block truncate text-xl sm:text-[1.7rem]">{a.towards}</span>
                  <span className="block text-[0.9rem] text-white/70">{a.seats === 0 ? "Standing only" : `${a.seats} seats free`}</span>
                </span>
                <span className="led whitespace-nowrap text-xl tabular-nums sm:text-[1.7rem]">{mins(a.minutes)}</span>
              </div>
            ))}
            {now && stopArrivals.length === 0 && <p className="led text-xl">No buses in the next hour</p>}
          </div>
        </section>
      </div>

      <section aria-labelledby="live-h" className="lg:sticky lg:top-20 lg:self-start">
        <h2 id="live-h" className="display text-3xl">
          Live map
        </h2>
        <div className="scroll-x -mx-4 mt-3 flex gap-1.5 px-4" role="group" aria-label="Show bus route">
          <button type="button" className="filter" aria-pressed={routeId === "all"} onClick={() => setRouteId("all")}>
            All routes
          </button>
          {ROUTES.map((r) => (
            <button key={r.id} type="button" className="filter" aria-pressed={routeId === r.id} onClick={() => setRouteId(r.id)} title={r.name}>
              {r.id}
            </button>
          ))}
        </div>
        <LiveMap routeId={routeId} />
        <ul className="mt-2 flex flex-wrap gap-x-5 text-[0.92rem] text-muted" aria-label="Map legend">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2 border-white bg-[#6d3a9c] shadow" aria-hidden="true" />
            Violet Line train
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2 border-white bg-sign shadow" aria-hidden="true" />
            Bus with seats
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2 border-white bg-mark shadow" aria-hidden="true" />
            Bus, almost full
          </li>
        </ul>
        <RouteTable routeId={routeId} now={now} />
      </section>
    </div>
  );
}

function RouteTable({ routeId, now }: { routeId: string; now: number | null }) {
  const rows = ROUTES.filter((r) => routeId === "all" || r.id === routeId);
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="py-1.5 pr-3 font-bold">
              Route
            </th>
            <th scope="col" className="py-1.5 pr-3 font-bold">
              Distance
            </th>
            <th scope="col" className="py-1.5 pr-3 font-bold">
              Buses out now
            </th>
            <th scope="col" className="py-1.5 font-bold">
              Seats free
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const buses = now ? busesOn(r, now) : [];
            return (
              <tr key={r.id} className="border-b border-line">
                <td className="py-1.5 pr-3">
                  <strong>{r.id}</strong> {r.name}
                </td>
                <td className="py-1.5 pr-3 tabular-nums">{Math.round(r.distanceM / 1000)} km</td>
                <td className="py-1.5 pr-3 tabular-nums">{buses.length}</td>
                <td className="py-1.5 tabular-nums">{buses.reduce((n, b) => n + b.seats, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LiveMap({ routeId }: { routeId: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const route = useRef(routeId);
  route.current = routeId;

  useEffect(() => {
    let gone = false;
    let raf = 0;
    (async () => {
      const L = await loadMapLibre();
      if (gone || !box.current) return;
      const m = new L.Map({ container: box.current, style: MAP_STYLE, center: FBD_FOCUS, zoom: 11.2, attributionControl: { compact: true }, cooperativeGestures: true });
      map.current = m;
      m.addControl(new L.NavigationControl({ showCompass: false }), "bottom-right");
      m.on("load", () => {
        tintBasemap(m);
        m.addSource("metro-line", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: LINE_WAYS } } });
        m.addLayer({ id: "metro-line", type: "line", source: "metro-line", paint: { "line-color": "#6d3a9c", "line-width": 3.5, "line-opacity": 0.75 } });
        m.addSource("bus-routes", { type: "geojson", data: { type: "FeatureCollection", features: ROUTES.map((r) => ({ type: "Feature", properties: { id: r.id }, geometry: { type: "LineString", coordinates: r.geometry } })) } });
        m.addLayer({ id: "bus-routes", type: "line", source: "bus-routes", paint: { "line-color": "#00603f", "line-width": 2, "line-opacity": 0.42 } });
        m.addSource("stations", { type: "geojson", data: { type: "FeatureCollection", features: STATIONS.map((s) => ({ type: "Feature", properties: { name: s.name }, geometry: { type: "Point", coordinates: [s.lng, s.lat] } })) } });
        m.addLayer({ id: "stations", type: "circle", source: "stations", paint: { "circle-radius": 4, "circle-color": "#fff", "circle-stroke-color": "#6d3a9c", "circle-stroke-width": 2 } });
        m.addLayer({ id: "station-names", type: "symbol", source: "stations", minzoom: 11.8, layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0.8, 0], "text-anchor": "left", "text-optional": true }, paint: { "text-color": "#3d2158", "text-halo-color": "#fff", "text-halo-width": 1.3 } });
        m.addSource("vehicles", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "vehicles",
          type: "circle",
          source: "vehicles",
          paint: {
            "circle-radius": ["match", ["get", "kind"], "train", 7.5, 6.5],
            "circle-color": ["match", ["get", "kind"], "train", "#6d3a9c", "full", "#ffc72c", "#00603f"],
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });
        m.addLayer({ id: "vehicle-labels", type: "symbol", source: "vehicles", minzoom: 12.5, layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-offset": [0, -1.3], "text-allow-overlap": false }, paint: { "text-color": "#0b2a20", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
        const popup = new L.Popup({ closeButton: false, offset: 10 });
        m.on("mouseenter", "vehicles", (e) => {
          m.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (f) popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setText(f.properties.detail).addTo(m);
        });
        m.on("mouseleave", "vehicles", () => {
          m.getCanvas().style.cursor = "";
          popup.remove();
        });
        setReady(true);

        // Vehicles glide continuously; the data is a pure function of the clock.
        let last = 0;
        const tick = (t: number) => {
          raf = requestAnimationFrame(tick);
          if (t - last < 120) return;
          last = t;
          const now = Date.now();
          const id = route.current;
          const features: GeoJSON.Feature[] = [
            ...metroTrains(now).map((tr) => ({ type: "Feature" as const, properties: { kind: "train", label: "", detail: `Violet Line towards ${DIRECTION_LABEL[tr.direction]}` }, geometry: { type: "Point" as const, coordinates: [tr.lng, tr.lat] } })),
            ...ROUTES.filter((r) => id === "all" || r.id === id).flatMap((r) =>
              busesOn(r, now).map((b) => ({ type: "Feature" as const, properties: { kind: b.seats < 6 ? "full" : "bus", label: r.id, detail: `Bus ${r.id}: ${b.seats} seats free, next stop ${b.nextStop}` }, geometry: { type: "Point" as const, coordinates: [b.lng, b.lat] } })),
            ),
          ];
          (m.getSource("vehicles") as GeoJSONSource).setData({ type: "FeatureCollection", features });
        };
        raf = requestAnimationFrame(tick);
      });
    })();
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setFilter("bus-routes", routeId === "all" ? null : ["==", ["get", "id"], routeId]);
    if (routeId !== "all") m.setPaintProperty("bus-routes", "line-opacity", 0.8);
    else m.setPaintProperty("bus-routes", "line-opacity", 0.42);
  }, [ready, routeId]);

  return <div ref={box} className="mt-3 h-[440px] bg-line lg:h-[520px]" data-lenis-prevent role="img" aria-label="Map of metro trains and buses" />;
}

const FBD_FOCUS: [number, number] = [FBD_CENTER[0] + 0.01, FBD_CENTER[1]];
