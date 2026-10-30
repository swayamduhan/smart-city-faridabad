"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { type AdminResource, adminDelete, adminSave } from "@/lib/actions";

export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[];
  optional?: boolean;
  wide?: boolean;
}

type Row = Record<string, unknown> & { id: string };

/** Generic list, edit and delete screen shared by notices, projects, jobs and candidates. */
export function ResourceManager({ resource, noun, rows, fields, title, detail }: { resource: AdminResource; noun: string; rows: Row[]; fields: Field[]; title: (r: Row) => string; detail: (r: Row) => string }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [limit, setLimit] = useState(30);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => `${title(r)} ${detail(r)}`.toLowerCase().includes(t)) : rows;
  }, [q, rows, title, detail]);

  return (
    <>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <label className="label" htmlFor="res-q">
            Search {noun}s
          </label>
          <input id="res-q" value={q} onChange={(e) => setQ(e.target.value)} className="field" />
        </div>
        <button type="button" className="btn btn-mark self-end" onClick={() => setEditing(editing === "new" ? null : "new")} aria-expanded={editing === "new"}>
          Add a {noun}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {editing === "new" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Editor resource={resource} noun={noun} fields={fields} row={null} onDone={() => setEditing(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 text-[0.95rem] text-muted" role="status">
        {list.length} {list.length === 1 ? noun : `${noun}s`}
      </p>
      <ul className="mt-1 border-t-2 border-ink">
        {list.slice(0, limit).map((r) => (
          <li key={r.id} className="border-b border-line">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-bold">{title(r)}</p>
                <p className="truncate text-[0.95rem] text-muted">{detail(r)}</p>
              </div>
              <button type="button" className="btn btn-line !min-h-10 shrink-0 !px-3 text-[0.95rem]" aria-expanded={editing === r.id} onClick={() => setEditing(editing === r.id ? null : r.id)}>
                Edit
              </button>
            </div>
            <AnimatePresence initial={false}>
              {editing === r.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <Editor resource={resource} noun={noun} fields={fields} row={r} onDone={() => setEditing(null)} />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="py-6 text-muted">Nothing matches. Clear the search or add a {noun}.</p>}
      {list.length > limit && (
        <button type="button" className="btn btn-line mt-4" onClick={() => setLimit((l) => l + 30)}>
          Show more
        </button>
      )}
    </>
  );
}

function Editor({ resource, noun, fields, row, onDone }: { resource: AdminResource; noun: string; fields: Field[]; row: Row | null; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="mb-4 mt-2 grid gap-3 bg-plate p-4 shadow-[inset_0_0_0_2px_var(--color-line)] md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.currentTarget));
        setError(null);
        start(async () => {
          const res = await adminSave(resource, row?.id ?? null, values);
          if (res.ok) onDone();
          else setError(res.error);
        });
      }}
    >
      {fields.map((f) => {
        const id = `${resource}-${row?.id ?? "new"}-${f.name}`;
        const value = row?.[f.name];
        return (
          <div key={f.name} className={f.wide ? "md:col-span-2" : ""}>
            <label className="label" htmlFor={id}>
              {f.label}
              {f.optional && <span className="font-normal text-muted"> (optional)</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea id={id} name={f.name} defaultValue={String(value ?? "")} rows={3} required={!f.optional} className="field" />
            ) : f.type === "select" ? (
              <select id={id} name={f.name} defaultValue={String(value ?? f.options?.[0]?.value ?? "")} className="field">
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input id={id} name={f.name} type={f.type ?? "text"} defaultValue={value === undefined ? "" : String(value)} required={!f.optional} className="field" />
            )}
          </div>
        );
      })}
      {error && (
        <p role="alert" className="font-semibold text-alert md:col-span-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <button className="btn btn-mark" disabled={pending}>
          {pending ? "Saving" : row ? "Save changes" : `Add ${noun}`}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        {row &&
          (confirming ? (
            <span className="ml-auto flex items-center gap-2">
              <span className="font-semibold">Delete this {noun}?</span>
              <button type="button" className="btn bg-alert text-white" disabled={pending} onClick={() => start(() => adminDelete(resource, row.id))}>
                Delete
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost ml-auto text-alert" onClick={() => setConfirming(true)}>
              Delete
            </button>
          ))}
      </div>
    </form>
  );
}
