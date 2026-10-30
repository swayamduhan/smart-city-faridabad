import { NextResponse } from "next/server";
import places from "@/data/places.json";
import { SERVICES } from "@/lib/bills";
import { getDb } from "@/lib/db";
import { NAV } from "@/lib/nav";
import type { Place } from "@/lib/types";

export interface SearchHit {
  title: string;
  detail?: string;
  kind: string;
  href: string;
}

const KIND: Record<Place["category"], string> = { schools: "School", hospitals: "Hospital", parks: "Park", cafes: "Cafe", food: "Food" };

function score(text: string, q: string) {
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  if (t.includes(q)) return 40;
  return 0;
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const db = getDb();
  const out: (SearchHit & { s: number })[] = [];
  const add = (hit: SearchHit, text: string, boost = 0) => {
    const s = score(text, q);
    if (s) out.push({ ...hit, s: s + boost });
  };

  for (const n of NAV) add({ title: n.label, kind: "Page", href: n.href }, `${n.label} ${n.hi}`, 25);
  for (const s of SERVICES) add({ title: `Pay ${s.label.toLowerCase()} bill`, kind: "Bill", href: `/pay?service=${s.id}` }, `${s.label} ${s.labelHi} bill`, 30);
  for (const p of places as Place[]) add({ title: p.name, detail: p.address, kind: KIND[p.category], href: `/map?place=${p.id}` }, `${p.name} ${p.nameHi ?? ""}`);
  for (const w of db.wards) add({ title: `Ward ${w.number}`, detail: w.name, kind: "Ward", href: `/wards/${w.number}` }, `ward ${w.number} ${w.name}`, 5);
  for (const j of db.jobs) add({ title: j.title, detail: `${j.employer}, ${j.locality}`, kind: "Job", href: `/jobs?job=${j.id}` }, `${j.title} ${j.employer} ${j.category}`);
  for (const p of db.projects) add({ title: p.name, detail: p.locality, kind: "Project", href: `/projects#${p.id}` }, `${p.name} ${p.locality} ${p.category}`);
  for (const c of db.candidates) add({ title: c.name, detail: `Ward ${c.ward}, ${c.status === "elected" ? "elected" : "standing"}`, kind: "Candidate", href: `/wards/${c.ward}` }, c.name, -10);

  out.sort((a, b) => b.s - a.s);
  const hits = out.slice(0, 9).map(({ s: _s, ...h }) => h);
  return NextResponse.json({ hits });
}
