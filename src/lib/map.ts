import type { Map as MapLibreMap } from "maplibre-gl";
import type { PlaceCategory } from "./types";

export const FBD_CENTER: [number, number] = [77.31, 28.41];
export const FBD_BOUNDS: [[number, number], [number, number]] = [[77.05, 28.2], [77.6, 28.62]];
// OpenFreeMap's vector tiles need no key, which keeps the demo zero-config.
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export const CATEGORY_META: Record<PlaceCategory, { label: string; hi: string; color: string }> = {
  schools: { label: "Schools", hi: "स्कूल", color: "#0f4c9e" },
  hospitals: { label: "Hospitals", hi: "अस्पताल", color: "#c9411f" },
  parks: { label: "Parks", hi: "पार्क", color: "#0a8a6a" },
  cafes: { label: "Cafes", hi: "कैफ़े", color: "#7a3fa0" },
  food: { label: "Food spots", hi: "खाने की जगहें", color: "#a87a00" },
};

/** Tints the neutral basemap toward the site's palette once the style has loaded. */
export function tintBasemap(map: MapLibreMap) {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#f1f5f0");
    if (layer.type === "fill" && /water/.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", "#c6dcdc");
    if (layer.type === "fill" && /(park|wood|forest|landcover_wood|grass)/.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", "#dde8d8");
  }
}

/** MapLibre's worker can't be resolved through the bundler, so it's served from /public (copied on install). */
export async function loadMapLibre() {
  const lib = await import("maplibre-gl");
  lib.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
  return lib;
}

export interface Photon {
  name: string;
  detail: string;
  lat: number;
  lng: number;
}

export async function searchPhoton(q: string, signal?: AbortSignal): Promise<Photon[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${FBD_CENTER[1]}&lon=${FBD_CENTER[0]}&limit=8&bbox=77.15,28.25,77.5,28.58`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Search service unavailable");
  const data = await res.json();
  return (data.features as { properties: Record<string, string>; geometry: { coordinates: [number, number] } }[]).map((f) => {
    const p = f.properties;
    return {
      name: p.name ?? p.street ?? p.district ?? "Unnamed place",
      detail: [p.street, p.district, p.city].filter((x, i, a) => x && x !== p.name && a.indexOf(x) === i).join(", "),
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    };
  });
}

export interface RouteResult {
  distanceKm: number;
  minutes: number;
  geometry: [number, number][];
}

export async function fetchRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing service unavailable");
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No road route found");
  return { distanceKm: route.distance / 1000, minutes: route.duration / 60, geometry: route.geometry.coordinates };
}

export function locate(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser can't share your location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) =>
        reject(new Error(err.code === err.PERMISSION_DENIED ? "Location access is blocked. Allow it in your browser's site settings, then try again." : "Your location couldn't be found. Try again, or search for a place instead.")),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 },
    );
  });
}

export const outsideCity = (p: { lat: number; lng: number }) => p.lat < FBD_BOUNDS[0][1] || p.lat > FBD_BOUNDS[1][1] || p.lng < FBD_BOUNDS[0][0] || p.lng > FBD_BOUNDS[1][0];
