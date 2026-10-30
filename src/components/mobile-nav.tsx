"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NAV } from "@/lib/nav";
import { RoadArrow } from "./road-arrow";

const PRIMARY = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/pay", label: "Pay" },
  { href: "/report", label: "Report" },
];

/** Thumb-reach navigation on phones; the desktop nav lives in the header. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <div className="h-16 lg:hidden no-print" aria-hidden="true" />
      <nav aria-label="Quick links" className="on-sign fixed inset-x-0 bottom-0 z-50 grid h-16 grid-cols-5 bg-sign pb-[env(safe-area-inset-bottom)] text-white lg:hidden no-print">
        {PRIMARY.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`grid place-items-center font-semibold ${active ? "text-mark" : ""}`}>
              {n.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`font-semibold ${open ? "text-mark" : ""}`}>
          More
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div className="plate on-sign fixed inset-x-2 bottom-[4.5rem] z-50 p-4 lg:hidden" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.2 }}>
            <ul className="grid grid-cols-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-white/10">
                    <RoadArrow dir={n.arrow} className="size-5" />
                    <span className="font-semibold">{n.label}</span>
                    <span className="hi ml-auto text-sm opacity-85">{n.hi}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
