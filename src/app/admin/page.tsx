import type { Metadata } from "next";
import Link from "next/link";
import { BarList, TrendChart } from "@/components/admin/charts";
import { formatLakh } from "@/components/admin/format-lakh";
import { SERVICES } from "@/lib/bills";
import { getDb } from "@/lib/db";
import { CATEGORY_LABEL, STATUS_LABEL, timeAgo } from "@/lib/format";
import type { IssueCategory, IssueStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

const DAY = 86_400_000;

export default function AdminOverview() {
  const db = getDb();
  const now = Date.now();
  const cutoff = now - 30 * DAY;
  const success = db.payments.filter((p) => p.status === "success");
  const recent = success.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
  const previous = success.filter((p) => {
    const t = new Date(p.createdAt).getTime();
    return t < cutoff && t >= cutoff - 30 * DAY;
  });
  const sum = (rows: typeof success) => rows.reduce((n, p) => n + p.amount, 0);
  const collected = sum(recent);
  const change = previous.length ? Math.round(((collected - sum(previous)) / sum(previous)) * 100) : 0;
  const failRate = (db.payments.filter((p) => p.status === "failed").length / Math.max(db.payments.length, 1)) * 100;

  const open = db.reports.filter((r) => r.status !== "resolved");
  const unassigned = open.filter((r) => !r.assignedTo);
  const resolved = db.reports.filter((r) => r.status === "resolved");
  const avgDays = resolved.reduce((n, r) => n + (new Date(r.events[r.events.length - 1].at).getTime() - new Date(r.createdAt).getTime()) / DAY, 0) / Math.max(resolved.length, 1);

  const trend = Array.from({ length: 30 }, (_, i) => {
    const start = now - (29 - i) * DAY;
    const key = new Date(start).toISOString().slice(0, 10);
    return { date: key, value: recent.filter((p) => p.createdAt.slice(0, 10) === key).reduce((n, p) => n + p.amount, 0) };
  });

  const byService = SERVICES.map((s) => ({ label: s.label, value: sum(recent.filter((p) => p.service === s.id)) })).sort((a, b) => b.value - a.value);
  const byCategory = (Object.keys(CATEGORY_LABEL) as IssueCategory[]).map((c) => ({ label: CATEGORY_LABEL[c], value: open.filter((r) => r.category === c).length })).sort((a, b) => b.value - a.value);
  const byStatus = (Object.keys(STATUS_LABEL) as IssueStatus[]).map((s) => ({ label: STATUS_LABEL[s], value: db.reports.filter((r) => r.status === s).length }));

  const wardCounts = new Map<number, number>();
  open.forEach((r) => wardCounts.set(r.ward, (wardCounts.get(r.ward) ?? 0) + 1));
  const hotWards = [...wardCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, value]) => ({ label: `Ward ${w}, ${db.wards.find((x) => x.number === w)?.localities[0] ?? ""}`, value }));

  const stats = [
    { value: formatLakh(collected), label: "Collected, last 30 days", note: `${change >= 0 ? "Up" : "Down"} ${Math.abs(change)}% on the 30 days before` },
    { value: String(open.length), label: "Open reports", note: `${unassigned.length} waiting for a crew` },
    { value: `${avgDays.toFixed(1)} days`, label: "Average time to fix", note: `Across ${resolved.length} resolved reports` },
    { value: `${failRate.toFixed(1)}%`, label: "Failed payments", note: `${db.payments.length} attempts in total` },
  ];

  return (
    <>
      <h1 className="display text-[clamp(2.2rem,4.5vw,3.6rem)]">Overview</h1>
      <p className="text-muted">All figures come from this demo&apos;s sample data, plus anything you add while using it.</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-t-2 border-ink pt-2">
            <dd className="display text-[clamp(1.9rem,3.2vw,3rem)] tabular-nums">{s.value}</dd>
            <dt className="font-semibold">{s.label}</dt>
            <dd className="text-[0.95rem] text-muted">{s.note}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-x-10 gap-y-10 xl:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="c-trend">
          <h2 id="c-trend" className="text-xl font-bold">
            Bill payments collected per day
          </h2>
          <div className="mt-2">
            <TrendChart data={trend} unit="Collected" />
          </div>
        </section>
        <section aria-labelledby="c-service">
          <h2 id="c-service" className="text-xl font-bold">
            Collected by service, last 30 days
          </h2>
          <div className="mt-3">
            <BarList rows={byService} money />
          </div>
        </section>
        <section aria-labelledby="c-cat">
          <h2 id="c-cat" className="text-xl font-bold">
            Open reports by type
          </h2>
          <div className="mt-3">
            <BarList rows={byCategory} />
          </div>
        </section>
        <section aria-labelledby="c-status">
          <h2 id="c-status" className="text-xl font-bold">
            All reports by status
          </h2>
          <div className="mt-3">
            <BarList rows={byStatus} />
          </div>
        </section>
        <section aria-labelledby="c-ward">
          <h2 id="c-ward" className="text-xl font-bold">
            Wards with the most open reports
          </h2>
          <div className="mt-3">
            <BarList rows={hotWards} />
          </div>
        </section>
        <section aria-labelledby="c-new">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="c-new" className="text-xl font-bold">
              Waiting for a crew
            </h2>
            <Link href="/admin/reports" className="link font-semibold">
              Assign crews
            </Link>
          </div>
          <ul className="mt-2 border-t-2 border-ink">
            {unassigned.slice(0, 5).map((r) => (
              <li key={r.id} className="border-b border-line py-2">
                <Link href={`/admin/reports?open=${r.id}`} className="link font-semibold">
                  {CATEGORY_LABEL[r.category]}, {r.locality}
                </Link>
                <span className="ml-2 text-[0.92rem] text-muted">{timeAgo(r.createdAt)}</span>
              </li>
            ))}
            {unassigned.length === 0 && <li className="py-3 text-muted">Every open report has a crew.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
