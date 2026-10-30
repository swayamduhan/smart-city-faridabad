"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { applyToJob, toggleSavedJob } from "@/lib/actions";
import { salaryRange, timeAgo } from "@/lib/format";
import type { Job } from "@/lib/types";

export function JobBoard({ jobs, signedIn, savedJobs, applied: initialApplied }: { jobs: Job[]; signedIn: boolean; savedJobs: string[]; applied: string[] }) {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [type, setType] = useState("Any type");
  const [open, setOpen] = useState<string | null>(params.get("job"));
  const [limit, setLimit] = useState(15);
  const [saved, setSaved] = useState(() => new Set(savedJobs));
  const [applied, setApplied] = useState(() => new Set(initialApplied));
  const [pending, start] = useTransition();

  const categories = useMemo(() => ["All", ...[...new Set(jobs.map((j) => j.category))].sort()], [jobs]);
  const types = useMemo(() => ["Any type", ...new Set(jobs.map((j) => j.type))], [jobs]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const opened = jobs.find((j) => j.id === open);
    const out = jobs.filter((j) => (cat === "All" || j.category === cat) && (type === "Any type" || j.type === type) && (!t || `${j.title} ${j.employer} ${j.locality} ${j.category}`.toLowerCase().includes(t)));
    // A job opened from search should be visible even if it's far down the list.
    return opened && out.includes(opened) ? [opened, ...out.filter((j) => j !== opened)] : out;
  }, [jobs, q, cat, type, open]);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div>
          <label className="label" htmlFor="job-q">
            Search jobs
          </label>
          <input id="job-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nurse, welder, Sector 24" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="job-type">
            Job type
          </label>
          <select id="job-type" value={type} onChange={(e) => setType(e.target.value)} className="field">
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="scroll-x -mx-4 mt-3 flex gap-1.5 px-4" role="group" aria-label="Filter by field">
        {categories.map((c) => (
          <button key={c} type="button" className="filter" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <p className="mt-5 text-[0.95rem] text-muted" role="status">
        {rows.length} {rows.length === 1 ? "job" : "jobs"}
      </p>
      <ul className="mt-1 border-t-2 border-ink">
        {rows.slice(0, limit).map((j) => {
          const expanded = open === j.id;
          return (
            <li key={j.id} className="border-b border-line">
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : j.id)} className="row-link grid w-full grid-cols-[1fr_auto] gap-x-4 px-1 py-3.5 text-left">
                <span className="min-w-0">
                  <span className="block text-[1.25rem] font-bold leading-snug">{j.title}</span>
                  <span className="block text-muted">
                    {j.employer}, {j.locality}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{j.salaryMax > 0 ? salaryRange(j.salaryMin, j.salaryMax) : "Pay not listed"}</span>
                  <span className="block text-[0.92rem] text-muted">{timeAgo(j.postedAt)}</span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                    <div className="px-1 pb-5">
                      <p className="max-w-[65ch]">{j.description}</p>
                      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[0.98rem]">
                        <div>
                          <dt className="inline text-muted">Type: </dt>
                          <dd className="inline font-semibold">{j.type}</dd>
                        </div>
                        <div>
                          <dt className="inline text-muted">Experience: </dt>
                          <dd className="inline font-semibold">{j.experience}</dd>
                        </div>
                        <div>
                          <dt className="inline text-muted">Openings: </dt>
                          <dd className="inline font-semibold">{j.openings}</dd>
                        </div>
                      </dl>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {j.externalUrl ? (
                          <a href={j.externalUrl} target="_blank" rel="noreferrer" className="btn btn-mark">
                            Apply on the employer&apos;s site
                          </a>
                        ) : !signedIn ? (
                          <Link href={`/login?next=${encodeURIComponent(`/jobs?job=${j.id}`)}`} className="btn btn-mark">
                            Sign in to apply
                          </Link>
                        ) : applied.has(j.id) ? (
                          <span className="chip status-resolved !px-3 !py-2 !text-base">Applied. Track it in your account</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-mark"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const res = await applyToJob(j.id);
                                if (res.ok) setApplied((s) => new Set(s).add(j.id));
                              })
                            }
                          >
                            Apply with my profile
                          </button>
                        )}
                        {signedIn && !j.externalUrl && (
                          <button
                            type="button"
                            className="btn btn-line"
                            disabled={pending}
                            aria-pressed={saved.has(j.id)}
                            onClick={() =>
                              start(async () => {
                                const res = await toggleSavedJob(j.id);
                                if (res.ok)
                                  setSaved((s) => {
                                    const n = new Set(s);
                                    if (res.data.saved) n.add(j.id);
                                    else n.delete(j.id);
                                    return n;
                                  });
                              })
                            }
                          >
                            {saved.has(j.id) ? "Saved" : "Save job"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && <p className="py-6 text-muted">No jobs match. Try fewer filters.</p>}
      {rows.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 15)} className="btn btn-line mt-4">
          Show more jobs
        </button>
      )}
    </>
  );
}
