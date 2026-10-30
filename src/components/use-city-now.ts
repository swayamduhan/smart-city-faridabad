"use client";

import { useEffect, useState } from "react";
import type { CityNow } from "@/app/api/city-now/route";

export function useCityNow() {
  const [now, setNow] = useState<CityNow | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const res = await fetch("/api/city-now");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as CityNow;
        if (live) {
          setNow(data);
          setFailed(false);
        }
      } catch {
        if (live) setFailed(true);
      }
    };
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);
  return { now, failed };
}
