"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_LABEL, STATUS_LABEL, timeAgo } from "@/lib/format";
import type { IssueCategory, IssueStatus } from "@/lib/types";
import { PinMap } from "./pin-map";

export interface ReportRow {
  id: string;
  ticket: string;
  category: IssueCategory;
  description: string;
  locality: string;
  ward: number;
  status: IssueStatus;
  createdAt: string;
  photoId?: string;
  lat: number;
  lng: number;
}

const STATUS_COLOR: Record<IssueStatus, string> = { submitted: "#6c7a73", acknowledged: "#0f4c9e", in_progress: "#e5a800", resolved: "#00603f" };

export function ReportList({ reports }: { reports: ReportRow[] }) {
  const [status, setStatus] = useState<IssueStatus | "open" | "all">("open");
  const [limit, setLimit] = useState(12);
  const rows = useMemo(() => reports.filter((r) => (status === "all" ? true : status === "open" ? r.status !== "resolved" : r.status === status)), [reports, status]);
  const counts = useMemo(() => ({ open: reports.filter((r) => r.status !== "resolved").length, resolved: reports.filter((r) => r.status === "resolved").length }), [reports]);

  return (
    <section className="mt-16" aria-labelledby="around">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="around" className="display text-[clamp(2rem,4vw,3.2rem)]">
            Reported around the city
          </h2>
          <p className="text-muted">
            {counts.open} open and {counts.resolved} resolved. Earlier reports are sample data.
          </p>
        </div>
        <div className="scroll-x flex gap-1.5" role="group" aria-label="Filter by status">
          {(
            [
              ["open", "Open"],
              ["in_progress", "In progress"],
              ["resolved", "Resolved"],
              ["all", "All"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className="filter" aria-pressed={status === id} onClick={() => setStatus(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_1fr]">
        <ul className="border-t-2 border-ink">
          {rows.slice(0, limit).map((r) => (
            <li key={r.id} className="border-b border-line">
              <Link href={`/report/${r.id}`} className="row-link flex items-start gap-3 px-1 py-3">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{CATEGORY_LABEL[r.category]}, {r.locality}</span>
                  <span className="block text-[0.98rem] text-muted">{r.description}</span>
                  <span className="block text-[0.9rem] text-muted">
                    {r.ticket}, ward {r.ward}, {timeAgo(r.createdAt)}
                  </span>
                </span>
                <span className={`chip shrink-0 status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
              </Link>
            </li>
          ))}
          {rows.length === 0 && <li className="py-6 text-muted">Nothing here right now. Try another filter.</li>}
        </ul>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PinMap className="h-[420px]" pins={rows.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, color: STATUS_COLOR[r.status], label: `${CATEGORY_LABEL[r.category]}, ${STATUS_LABEL[r.status]}`, href: `/report/${r.id}` }))} />
          <ul className="mt-2 flex flex-wrap gap-x-4 text-[0.9rem] text-muted" aria-label="Map legend">
            {(Object.keys(STATUS_COLOR) as IssueStatus[]).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} aria-hidden="true" />
                {STATUS_LABEL[s]}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {rows.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 12)} className="btn btn-line mt-4">
          Show more reports
        </button>
      )}
    </section>
  );
}
