import Link from "next/link";
import places from "@/data/places.json";
import { Hero, type Destination } from "@/components/hero";
import { KundShowcase } from "@/components/kund-showcase";
import { SmoothScroll } from "@/components/smooth-scroll";
import { VisitorStrip } from "@/components/visitor-strip";
import { getDb } from "@/lib/db";
import { STAGE_LABEL, crore, timeAgo } from "@/lib/format";
import { NAV } from "@/lib/nav";

const VALUE_ORDER = ["/pay", "/report", "/map", "/transit", "/jobs", "/wards"];

export default function Home() {
  const db = getDb();
  const open = db.reports.filter((r) => r.status !== "resolved").length;
  const values: Record<string, string> = {
    "/pay": "7 services",
    "/report": `${open} being fixed`,
    "/map": `${places.length} places`,
    "/transit": "Live",
    "/jobs": `${db.jobs.length} open`,
    "/wards": `${db.wards.length} wards`,
  };
  const destinations: Destination[] = VALUE_ORDER.map((href) => {
    const n = NAV.find((x) => x.href === href)!;
    return { href, label: n.label, hi: n.hi, arrow: n.arrow, value: values[href] };
  });
  const notices = db.announcements.slice(0, 4);
  const building = db.projects.filter((p) => p.stage === "under_construction").sort((a, b) => b.progress - a.progress).slice(0, 4);

  return (
    <>
      <SmoothScroll />
      <Hero destinations={destinations} />
      <KundShowcase />
      <VisitorStrip />

      <section className="mx-auto grid max-w-[1600px] gap-x-16 gap-y-12 px-4 pt-16 lg:grid-cols-[1fr_1.1fr] lg:px-8 lg:pt-24">
        <div>
          <div className="flex items-end justify-between gap-4">
            <h2 className="display text-[clamp(2rem,4vw,3.4rem)]">City notices</h2>
            <Link href="/city" className="link font-semibold">
              All notices
            </Link>
          </div>
          <ul className="mt-5 border-t-2 border-ink">
            {notices.map((a) => (
              <li key={a.id} className="border-b border-line py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-xl font-bold leading-snug">{a.title}</h3>
                  <span className="shrink-0 text-[0.92rem] text-muted">{timeAgo(a.publishedAt)}</span>
                </div>
                <p className="mt-1 max-w-[62ch] text-muted">{a.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-end justify-between gap-4">
            <h2 className="display text-[clamp(2rem,4vw,3.4rem)]">Being built now</h2>
            <Link href="/projects" className="link font-semibold">
              All projects
            </Link>
          </div>
          <ul className="mt-5 border-t-2 border-ink">
            {building.map((p) => (
              <li key={p.id} className="border-b border-line py-4">
                <Link href={`/projects#${p.id}`} className="group block">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-xl font-bold leading-snug group-hover:underline">{p.name}</h3>
                    <span className="display shrink-0 text-2xl tabular-nums">{p.progress}%</span>
                  </div>
                  <div className="mt-2 h-2.5 bg-line" role="img" aria-label={`${p.progress}% complete`}>
                    <div className="h-full bg-sign" style={{ width: `${p.progress}%` }} />
                  </div>
                  <p className="mt-2 text-[0.95rem] text-muted">
                    {p.locality}, {crore(p.budgetCr)}, {STAGE_LABEL[p.stage].toLowerCase()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
