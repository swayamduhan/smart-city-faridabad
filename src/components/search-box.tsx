"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchHit } from "@/app/api/search/route";

/** Site-wide search used in the hero and the Ctrl+K palette. */
export function SearchBox({ autoFocus, onNavigate, placeholder = "Search a place, a bill, a job or a ward" }: { autoFocus?: boolean; onNavigate?: () => void; placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setSearched(false);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const data = (await res.json()) as { hits: SearchHit[] };
        setHits(data.hits);
        setActive(0);
        setSearched(true);
        setOpen(true);
      } catch {
        // Aborted by the next keystroke.
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ("");
    onNavigate?.();
    router.push(hit.href);
  };

  return (
    <div ref={box} className="relative text-ink">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (hits[active]) go(hits[active]);
          else if (q.trim()) {
            onNavigate?.();
            router.push(`/map?q=${encodeURIComponent(q.trim())}`);
          }
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>
          Search Faridabad
        </label>
        <div className="flex items-center rounded-md bg-white shadow-[0_6px_30px_rgb(0_0_0/0.18)]">
          <svg viewBox="0 0 20 20" className="ml-4 size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 5 5" />
          </svg>
          <input
            id={`${listId}-input`}
            autoFocus={autoFocus}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => hits.length && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, hits.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && hits[active] ? `${listId}-${active}` : undefined}
            className="h-14 w-full bg-transparent px-3 pt-1 text-lg outline-none placeholder:text-muted"
          />
        </div>
      </form>
      {open && searched && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-[52vh] overflow-auto rounded-md bg-white py-1 shadow-[0_18px_50px_rgb(0_0_0/0.28)]">
          {hits.length === 0 && (
            <li className="px-4 py-3 text-muted">
              Nothing found for “{q.trim()}”. Press Enter to search the map instead.
            </li>
          )}
          {hits.map((h, i) => (
            <li key={h.href + h.title} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(h)} className={`flex w-full items-baseline justify-between gap-4 px-4 py-2.5 text-left ${i === active ? "bg-ground" : ""}`}>
                <span>
                  <span className="font-semibold">{h.title}</span>
                  {h.detail && <span className="ml-2 text-[0.92rem] text-muted">{h.detail}</span>}
                </span>
                <span className="shrink-0 text-sm text-muted">{h.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
