"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import places from "@/data/places.json";
import { toggleSavedPlace } from "@/lib/actions";
import { distanceKm } from "@/lib/format";
import { CATEGORY_META, locate } from "@/lib/map";
import type { Place, PlaceCategory } from "@/lib/types";

const ALL = places as Place[];
const CATS = Object.keys(CATEGORY_META) as PlaceCategory[];

export function PlacesDirectory({ signedIn, savedPlaces }: { signedIn: boolean; savedPlaces: string[] }) {
  const params = useSearchParams();
  const [cat, setCat] = useState<PlaceCategory | "all">((params.get("cat") as PlaceCategory) ?? "all");
  const [q, setQ] = useState("");
  const [you, setYou] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [limit, setLimit] = useState(30);
  const [saved, setSaved] = useState(() => new Set(savedPlaces));
  const [, start] = useTransition();

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = cat === "all" ? ALL : ALL.filter((p) => p.category === cat);
    if (term) out = out.filter((p) => p.name.toLowerCase().includes(term) || p.address?.toLowerCase().includes(term) || p.cuisine?.toLowerCase().includes(term));
    return you ? [...out].sort((a, b) => distanceKm(you, a) - distanceKm(you, b)) : [...out].sort((a, b) => a.name.localeCompare(b.name));
  }, [cat, q, you]);

  const near = async () => {
    setLocating(true);
    setLocError(null);
    try {
      setYou(await locate());
    } catch (e) {
      setLocError((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  const counts = useMemo(() => Object.fromEntries(CATS.map((c) => [c, ALL.filter((p) => p.category === c).length])) as Record<PlaceCategory, number>, []);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <label className="label" htmlFor="place-q">
            Search places
          </label>
          <input id="place-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, area or cuisine" className="field" />
        </div>
        <button type="button" className="btn btn-mark self-end" onClick={near} disabled={locating}>
          {locating ? "Finding you" : you ? "Sorted by distance" : "Sort by nearest to me"}
        </button>
      </div>
      {locError && (
        <p role="alert" className="mt-2 font-semibold text-alert">
          {locError}
        </p>
      )}
      <div className="scroll-x -mx-4 mt-4 flex gap-1.5 px-4" role="group" aria-label="Filter by type">
        <button type="button" className="filter" aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          All {ALL.length}
        </button>
        {CATS.map((c) => (
          <button key={c} type="button" className="filter flex items-center gap-1.5" aria-pressed={cat === c} onClick={() => setCat(c)}>
            <span className="size-2.5 rounded-full ring-1 ring-white" style={{ background: CATEGORY_META[c].color }} aria-hidden="true" />
            {CATEGORY_META[c].label} {counts[c]}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[0.95rem] text-muted" role="status">
        {rows.length} {rows.length === 1 ? "place" : "places"}
      </p>
      <ul className="mt-1 border-t-2 border-ink">
        <AnimatePresence initial={false}>
          {rows.slice(0, limit).map((p) => (
            <motion.li key={p.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-line py-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-bold">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_META[p.category].color }} aria-hidden="true" />
                  <span>{p.name}</span>
                  {p.emergency && <span className="chip bg-alert text-white">Emergency</span>}
                </h2>
                <p className="text-[0.98rem] text-muted">{[CATEGORY_META[p.category].label, p.cuisine, p.address, p.hours].filter(Boolean).join(". ")}</p>
                {p.phone && (
                  <a href={`tel:${p.phone.replace(/[^+\d]/g, "")}`} className="link text-[0.98rem]">
                    {p.phone}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3 text-right">
                {you && <span className="whitespace-nowrap text-[0.95rem] tabular-nums text-muted">{distanceKm(you, p).toFixed(1)} km</span>}
                {signedIn && (
                  <button
                    type="button"
                    aria-pressed={saved.has(p.id)}
                    aria-label={`${saved.has(p.id) ? "Remove" : "Save"} ${p.name}`}
                    className="link hidden text-[0.95rem] font-semibold sm:block"
                    onClick={() =>
                      start(async () => {
                        const res = await toggleSavedPlace(p.id);
                        if (res.ok)
                          setSaved((s) => {
                            const n = new Set(s);
                            if (res.data.saved) n.add(p.id);
                            else n.delete(p.id);
                            return n;
                          });
                      })
                    }
                  >
                    {saved.has(p.id) ? "Saved" : "Save"}
                  </button>
                )}
                <Link href={`/map?place=${p.id}`} className="btn btn-line !min-h-10 !px-3 text-[0.95rem]">
                  Map
                </Link>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {rows.length === 0 && <p className="py-6 text-muted">No places match. Try a different word or filter.</p>}
      {rows.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 30)} className="btn btn-line mt-4">
          Show more places
        </button>
      )}
    </>
  );
}
