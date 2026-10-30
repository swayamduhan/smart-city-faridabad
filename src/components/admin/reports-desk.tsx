"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { updateReport } from "@/lib/actions";
import { CATEGORY_LABEL, STATUS_LABEL, dateTime, timeAgo } from "@/lib/format";
import type { IssueCategory, IssueReport, IssueStatus } from "@/lib/types";

const CREWS = ["Road crew 4", "Sanitation team B", "Electrical team 2", "Water works team 1", "Drainage team 3"];
const STATUSES = Object.keys(STATUS_LABEL) as IssueStatus[];

export function ReportsDesk({ reports }: { reports: IssueReport[] }) {
  const params = useSearchParams();
  const [status, setStatus] = useState<IssueStatus | "open" | "all">("open");
  const [category, setCategory] = useState<IssueCategory | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(params.get("open"));
  const [limit, setLimit] = useState(25);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return reports.filter(
      (r) =>
        (status === "all" ? true : status === "open" ? r.status !== "resolved" : r.status === status) &&
        (category === "all" || r.category === category) &&
        (!t || `${r.ticket} ${r.description} ${r.locality} ward ${r.ward}`.toLowerCase().includes(t)),
    );
  }, [reports, status, category, q]);

  return (
    <>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_200px_200px]">
        <div>
          <label className="label" htmlFor="r-q">
            Search
          </label>
          <input id="r-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticket, area or ward" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="r-status">
            Status
          </label>
          <select id="r-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="field">
            <option value="open">All open</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
            <option value="all">Everything</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-cat">
            Type
          </label>
          <select id="r-cat" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="field">
            <option value="all">All types</option>
            {(Object.keys(CATEGORY_LABEL) as IssueCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 text-[0.95rem] text-muted" role="status">
        {rows.length} {rows.length === 1 ? "report" : "reports"}
      </p>
      <ul className="mt-1 border-t-2 border-ink">
        {rows.slice(0, limit).map((r) => (
          <li key={r.id} className="border-b border-line">
            <button type="button" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)} className="row-link grid w-full grid-cols-[1fr_auto] gap-x-4 px-1 py-2.5 text-left">
              <span className="min-w-0">
                <span className="font-bold">
                  {CATEGORY_LABEL[r.category]}, {r.locality}
                </span>
                <span className="block truncate text-muted">{r.description}</span>
                <span className="block text-[0.9rem] text-muted">
                  {r.ticket}, ward {r.ward}, {timeAgo(r.createdAt)}, {r.assignedTo ?? "no crew yet"}
                </span>
              </span>
              <span className={`chip self-start status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
            </button>
            <AnimatePresence initial={false}>
              {open === r.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                  <Triage report={r} />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="py-6 text-muted">No reports match these filters.</p>}
      {rows.length > limit && (
        <button type="button" className="btn btn-line mt-4" onClick={() => setLimit((l) => l + 25)}>
          Show more reports
        </button>
      )}
    </>
  );
}

function Triage({ report }: { report: IssueReport }) {
  const [status, setStatus] = useState(report.status);
  const [crew, setCrew] = useState(report.assignedTo ?? "");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-5 px-1 pb-5 pt-1 lg:grid-cols-[1.1fr_1fr]"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        start(async () => {
          await updateReport(report.id, status, crew, note);
          setNote("");
          setSaved(true);
        });
      }}
    >
      <div>
        <p>{report.description}</p>
        {report.photoId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/uploads/${report.photoId}`} alt="Photo sent by the citizen" className="mt-2 max-h-56" />
        )}
        <ul className="mt-2 text-[0.95rem] text-muted">
          {report.events.map((e) => (
            <li key={e.at + e.status}>
              {dateTime(e.at)}: {e.note}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor={`s-${report.id}`}>
              Status
            </label>
            <select id={`s-${report.id}`} value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)} className="field">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`c-${report.id}`}>
              Crew
            </label>
            <select id={`c-${report.id}`} value={crew} onChange={(e) => setCrew(e.target.value)} className="field">
              <option value="">No crew yet</option>
              {CREWS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor={`n-${report.id}`}>
            Note for the citizen
          </label>
          <input id={`n-${report.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Crew will reach the site tomorrow morning" className="field" />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-mark" disabled={pending}>
            {pending ? "Saving" : "Save update"}
          </button>
          {saved && (
            <span role="status" className="font-semibold text-sign">
              Update saved. The citizen can see it now.
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
