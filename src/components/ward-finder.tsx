"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { distanceKm } from "@/lib/format";
import { locate, outsideCity } from "@/lib/map";

interface Row {
  number: number;
  name: string;
  lat: number;
  lng: number;
  councillor: string;
  party: string;
  standing: number;
}

export function WardFinder({ wards }: { wards: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return wards;
    return wards.filter((w) => String(w.number) === t || w.name.toLowerCase().includes(t) || w.councillor.toLowerCase().includes(t) || w.party.toLowerCase().includes(t));
  }, [q, wards]);

  const mine = async () => {
    setLocating(true);
    setError(null);
    try {
      const p = await locate();
      if (outsideCity(p)) {
        setError("You seem to be outside Faridabad. Search by your sector or colony instead.");
        return;
      }
      const nearest = wards.reduce((a, b) => (distanceKm(a, p) < distanceKm(b, p) ? a : b));
      router.push(`/wards/${nearest.number}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <label className="label" htmlFor="ward-q">
            Search by sector, colony, ward number or name
          </label>
          <input id="ward-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sector 15" className="field" />
        </div>
        <button type="button" onClick={mine} disabled={locating} className="btn btn-mark self-end">
          {locating ? "Finding you" : "Find my ward"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-semibold text-alert">
          {error}
        </p>
      )}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-2 pr-4 font-bold">
                Ward
              </th>
              <th scope="col" className="py-2 pr-4 font-bold">
                Area
              </th>
              <th scope="col" className="py-2 pr-4 font-bold">
                Elected councillor
              </th>
              <th scope="col" className="py-2 text-right font-bold">
                Standing next
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.number} className="row-link relative border-b border-line">
                <td className="py-2.5 pr-4 align-top">
                  <Link href={`/wards/${w.number}`} className="display text-2xl tabular-nums after:absolute after:inset-0">
                    {w.number}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 align-top font-semibold">{w.name}</td>
                <td className="py-2.5 pr-4 align-top">
                  {w.councillor}
                  <span className="block text-[0.92rem] text-muted">{w.party}</span>
                </td>
                <td className="py-2.5 text-right align-top tabular-nums">{w.standing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="py-6 text-muted">No ward matches “{q}”. Try a sector number or colony name.</p>}
    </>
  );
}
