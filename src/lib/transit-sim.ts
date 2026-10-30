import transit from "@/data/transit.json";

// No public real-time feed exists for Faridabad, so vehicles are simulated from the clock.
// Everyone sees the same positions, and they stay consistent across reloads.

export interface Station { name: string; nameHi?: string; lat: number; lng: number }
export interface BusStop { name: string; lat: number; lng: number; atSec: number }
export interface BusRoute { id: string; name: string; durationSec: number; distanceM: number; stops: BusStop[]; geometry: [number, number][] }

export const STATIONS = (transit.stations as Station[]).filter((s) => s.lat);
export const LINE_WAYS = transit.lineWays as [number, number][][];
export const ROUTES = transit.routes as unknown as BusRoute[];

const METRO_HOP_SEC = 150;
const METRO_HEADWAY_SEC = 360;
const BUS_HEADWAY: Record<string, number> = { "101": 600, "205": 900, "307": 1200, "412": 900, "518": 1500 };
const BUS_CAPACITY = 42;

function noise(a: number, b: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Crowding follows the working day: busy around 9 am and 6 pm in India time. */
export function crowdLevel(now: Date) {
  const h = (now.getUTCHours() + 5.5 + now.getUTCMinutes() / 60) % 24;
  const peak = Math.exp(-((h - 9) ** 2) / 3) + Math.exp(-((h - 18) ** 2) / 4);
  return Math.min(1, 0.22 + 0.72 * peak);
}

export type Direction = "north" | "south";
export const DIRECTION_LABEL: Record<Direction, string> = { south: "Raja Nahar Singh", north: "Kashmere Gate" };

export interface Arrival { minutes: number; seconds: number; direction: Direction; load: "Seats free" | "Filling up" | "Crowded"; tripId: number }

export function metroArrivals(stationIndex: number, nowMs: number, count = 3): Arrival[] {
  const t = nowMs / 1000;
  const out: Arrival[] = [];
  const crowd = crowdLevel(new Date(nowMs));
  for (const direction of ["south", "north"] as Direction[]) {
    const offset = (direction === "south" ? stationIndex : STATIONS.length - 1 - stationIndex) * METRO_HOP_SEC + (direction === "north" ? 137 : 0);
    let next = METRO_HEADWAY_SEC - ((t - offset) % METRO_HEADWAY_SEC);
    if (next < 0) next += METRO_HEADWAY_SEC;
    for (let i = 0; i < count; i++) {
      const eta = next + i * METRO_HEADWAY_SEC;
      const tripId = Math.round((t + eta - offset) / METRO_HEADWAY_SEC);
      const load = crowd * 0.8 + noise(tripId, stationIndex) * 0.35;
      out.push({ minutes: Math.floor(eta / 60), seconds: Math.floor(eta % 60), direction, tripId, load: load > 0.78 ? "Crowded" : load > 0.48 ? "Filling up" : "Seats free" });
    }
  }
  return out;
}

export interface MetroTrain { lng: number; lat: number; direction: Direction; id: string }

export function metroTrains(nowMs: number): MetroTrain[] {
  const t = nowMs / 1000;
  const span = (STATIONS.length - 1) * METRO_HOP_SEC;
  const trains: MetroTrain[] = [];
  for (const direction of ["south", "north"] as Direction[]) {
    const base = direction === "north" ? 137 : 0;
    for (let k = 0; k * METRO_HEADWAY_SEC < span + METRO_HEADWAY_SEC; k++) {
      const progress = ((t - base) % METRO_HEADWAY_SEC) + k * METRO_HEADWAY_SEC;
      if (progress > span) continue;
      const f = progress / METRO_HOP_SEC;
      const i = Math.min(Math.floor(f), STATIONS.length - 2);
      const a = direction === "south" ? STATIONS[i] : STATIONS[STATIONS.length - 1 - i];
      const b = direction === "south" ? STATIONS[i + 1] : STATIONS[STATIONS.length - 2 - i];
      const u = Math.min(1, (f - i) * 1.25); // dwell briefly at each station
      trains.push({ lat: a.lat + (b.lat - a.lat) * u, lng: a.lng + (b.lng - a.lng) * u, direction, id: `${direction}-${k}` });
    }
  }
  return trains;
}

function pathLengths(geometry: [number, number][]) {
  const cum = [0];
  for (let i = 1; i < geometry.length; i++) {
    const [ax, ay] = geometry[i - 1];
    const [bx, by] = geometry[i];
    cum.push(cum[i - 1] + Math.hypot((bx - ax) * Math.cos((ay * Math.PI) / 180), by - ay));
  }
  return cum;
}

const lengths = new Map(ROUTES.map((r) => [r.id, pathLengths(r.geometry)]));

function pointAlong(route: BusRoute, f: number): [number, number] {
  const cum = lengths.get(route.id)!;
  const target = f * cum[cum.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid;
    else hi = mid;
  }
  const u = (target - cum[lo]) / Math.max(cum[hi] - cum[lo], 1e-9);
  const [ax, ay] = route.geometry[lo];
  const [bx, by] = route.geometry[hi];
  return [ax + (bx - ax) * u, ay + (by - ay) * u];
}

export interface Bus { id: string; routeId: string; lng: number; lat: number; seats: number; nextStop: string; etaMin: number; outbound: boolean }

/** A bus covers the route out and back; traffic makes the real run slower than the free-flow estimate. */
export function busesOn(route: BusRoute, nowMs: number): Bus[] {
  const t = nowMs / 1000;
  const headway = BUS_HEADWAY[route.id] ?? 900;
  const oneWay = route.durationSec * 1.6;
  const cycle = oneWay * 2;
  const count = Math.max(1, Math.round(cycle / headway));
  const crowd = crowdLevel(new Date(nowMs));
  const buses: Bus[] = [];
  for (let k = 0; k < count; k++) {
    const phase = ((t + (k * cycle) / count) % cycle) / oneWay;
    const outbound = phase <= 1;
    const f = outbound ? phase : 2 - phase;
    const [lng, lat] = pointAlong(route, f);
    const elapsed = f * route.durationSec;
    const stops = outbound ? route.stops : [...route.stops].reverse();
    const next = outbound ? stops.find((s) => s.atSec >= elapsed) : stops.find((s) => s.atSec <= elapsed);
    const eta = next ? Math.abs(next.atSec - elapsed) * 1.6 : 0;
    const slot = Math.floor(t / 300);
    const seats = Math.max(0, Math.round(BUS_CAPACITY * (1 - crowd * (0.55 + noise(k, slot + Number(route.id)) * 0.55))));
    buses.push({ id: `${route.id}-${k + 1}`, routeId: route.id, lng, lat, seats, nextStop: next?.name ?? stops[stops.length - 1].name, etaMin: Math.ceil(eta / 60), outbound });
  }
  return buses;
}

export interface StopArrival { routeId: string; routeName: string; minutes: number; seats: number; towards: string }

export function arrivalsAtStop(stopName: string, nowMs: number): StopArrival[] {
  const out: StopArrival[] = [];
  for (const route of ROUTES) {
    const stop = route.stops.find((s) => s.name === stopName);
    if (!stop) continue;
    for (const bus of busesOn(route, nowMs)) {
      const f = busProgressSec(route, bus, nowMs);
      const towards = bus.outbound ? route.stops[route.stops.length - 1].name : route.stops[0].name;
      const remaining = bus.outbound ? stop.atSec - f : f - stop.atSec;
      if (remaining >= 0) out.push({ routeId: route.id, routeName: route.name, minutes: Math.round((remaining * 1.6) / 60), seats: bus.seats, towards });
    }
  }
  return out.sort((a, b) => a.minutes - b.minutes);
}

function busProgressSec(route: BusRoute, bus: Bus, nowMs: number) {
  const k = Number(bus.id.split("-")[1]) - 1;
  const headway = BUS_HEADWAY[route.id] ?? 900;
  const oneWay = route.durationSec * 1.6;
  const cycle = oneWay * 2;
  const count = Math.max(1, Math.round(cycle / headway));
  const phase = ((nowMs / 1000 + (k * cycle) / count) % cycle) / oneWay;
  return (phase <= 1 ? phase : 2 - phase) * route.durationSec;
}

export const ALL_STOPS = [...new Set(ROUTES.flatMap((r) => r.stops.map((s) => s.name)))].sort();
