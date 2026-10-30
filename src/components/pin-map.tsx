"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { FBD_CENTER, MAP_STYLE, loadMapLibre, tintBasemap } from "@/lib/map";

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
  href?: string;
}

/** A small read-only map of pins, or a single draggable pin when `onPick` is given. */
export function PinMap({ pins, onPick, className = "h-[340px]", zoom = 11.2, center }: { pins: Pin[]; onPick?: (p: { lat: number; lng: number }) => void; className?: string; zoom?: number; center?: { lat: number; lng: number } }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  const draw = () => {
    const m = map.current;
    const L = lib.current;
    if (!m || !L) return;
    markers.current.forEach((x) => x.remove());
    markers.current = pins.map((p) => {
      if (pick.current) {
        const marker = new L.Marker({ color: "#ffc72c", draggable: true }).setLngLat([p.lng, p.lat]).addTo(m);
        marker.on("dragend", () => {
          const c = marker.getLngLat();
          pick.current?.({ lat: c.lat, lng: c.lng });
        });
        return marker;
      }
      const el = document.createElement(p.href ? "a" : "div");
      el.className = "map-pin";
      el.style.background = p.color;
      el.title = p.label;
      el.setAttribute("aria-label", p.label);
      if (p.href) (el as HTMLAnchorElement).href = p.href;
      return new L.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
    });
  };

  useEffect(() => {
    let gone = false;
    (async () => {
      const L = await loadMapLibre();
      if (gone || !box.current) return;
      lib.current = L;
      const m = new L.Map({ container: box.current, style: MAP_STYLE, center: center ? [center.lng, center.lat] : FBD_CENTER, zoom, attributionControl: { compact: true }, cooperativeGestures: !pick.current });
      map.current = m;
      m.addControl(new L.NavigationControl({ showCompass: false }), "bottom-right");
      m.on("load", () => tintBasemap(m));
      if (pick.current) {
        m.on("click", (e) => pick.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      }
      draw();
    })();
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
    };
    // The map itself should only be created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    draw();
    if (center && map.current) map.current.easeTo({ center: [center.lng, center.lat], zoom: Math.max(map.current.getZoom(), 15) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pins), center?.lat, center?.lng]);

  return <div ref={box} className={`w-full bg-line ${className}`} data-lenis-prevent />;
}
