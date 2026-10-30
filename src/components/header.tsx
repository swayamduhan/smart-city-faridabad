"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NAV } from "@/lib/nav";
import { SearchBox } from "./search-box";

const DESKTOP = NAV.filter((n) => n.href !== "/city");

export function Header({ user }: { user: { name: string; role: "citizen" | "admin" } | null }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setPaletteOpen(false), [pathname]);

  return (
    <>
      <header className="on-sign sticky top-0 z-50 bg-sign text-white no-print">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 lg:gap-6 lg:px-8">
          <Link href="/" className="flex items-baseline gap-2 shrink-0" aria-label="Faridabad, home">
            <span className="display text-xl">Faridabad</span>
            <span className="hi hidden text-sm opacity-90 sm:inline">फरीदाबाद</span>
          </Link>
          <nav aria-label="Main" className="ml-2 hidden flex-1 items-center gap-1 lg:flex">
            {DESKTOP.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className="relative whitespace-nowrap rounded px-2 py-1 pt-1.5 text-[0.95rem] font-semibold hover:bg-white/12">
                  {n.label}
                  {active && <motion.span layoutId="nav-mark" className="absolute inset-x-2 -bottom-0.5 h-[3px] bg-mark" />}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setPaletteOpen(true)} className="flex h-9 items-center gap-2 rounded bg-white/12 px-3 text-[0.95rem] hover:bg-white/20" aria-label="Search everything">
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 5 5" />
              </svg>
              <span className="hidden xl:inline">Search</span>
              <kbd className="hidden rounded bg-white/15 px-1.5 text-xs xl:inline">Ctrl K</kbd>
            </button>
            {user ? (
              <Link href={user.role === "admin" ? "/admin" : "/account"} className="flex h-9 items-center gap-2 rounded bg-mark px-3 pt-0.5 text-[0.95rem] font-bold text-ink hover:bg-mark-deep">
                {user.role === "admin" ? "Admin" : user.name.split(" ")[0]}
              </Link>
            ) : (
              <Link href="/login" className="flex h-9 items-center rounded bg-mark px-3 pt-0.5 text-[0.95rem] font-bold text-ink hover:bg-mark-deep">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {paletteOpen && (
          <motion.div className="fixed inset-0 z-[70] bg-night/70 px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setPaletteOpen(false)} role="dialog" aria-modal="true" aria-label="Search everything">
            <motion.div className="mx-auto max-w-2xl" initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
              <SearchBox autoFocus onNavigate={() => setPaletteOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
