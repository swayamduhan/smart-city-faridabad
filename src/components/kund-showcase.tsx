"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { STOPS } from "@/lib/showcase";
import { createKundRenderer } from "./kund-shader";
import { scrollToY } from "./smooth-scroll";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Pinned while the page scrolls: scroll position drives the shader from one stop to the next. */
export function KundShowcase() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [plain, setPlain] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    const sec = section.current;
    if (!cv || !sec) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlain(true);
      return;
    }
    const renderer = createKundRenderer(
      cv,
      STOPS.map((s) => ({ src: s.src, size: [s.width, s.height], focus: s.focus })),
      () => setReady(true),
    );
    if (!renderer) {
      setPlain(true);
      return;
    }

    let raf = 0;
    let inView = true;
    let mouse: [number, number] = [0.5, 0.5];
    let target: [number, number] = [0.5, 0.5];
    let mouseV = 0;
    const start = performance.now();
    let shown = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!inView) return;
      const rect = sec.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / span));
      const s = progress * (STOPS.length - 1);
      const i = Math.min(Math.floor(s), STOPS.length - 2);
      const f = s - i;
      // Hold each photo long enough to read the caption before the terraces open.
      const p = smooth(0.34, 0.96, f);
      const next = p > 0.5 ? i + 1 : i;
      if (next !== shown) {
        shown = next;
        setActive(next);
      }
      if (bar.current) bar.current.style.transform = `scaleY(${progress})`;
      mouse = [mouse[0] + (target[0] - mouse[0]) * 0.07, mouse[1] + (target[1] - mouse[1]) * 0.07];
      mouseV *= 0.96;
      renderer.draw({
        a: i,
        b: i + 1,
        p,
        time: (now - start) / 1000,
        zoomA: 1.02 + f * 0.05,
        zoomB: 1.08 - p * 0.06,
        mouse,
        mouseV,
      });
    };
    raf = requestAnimationFrame(frame);

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      target = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      mouseV = Math.min(1, mouseV + 0.05);
    };
    const onResize = () => renderer.resize();
    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting));
    io.observe(sec);
    sec.addEventListener("pointermove", onMove);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      sec.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.destroy();
    };
  }, []);

  const jumpTo = (i: number) => {
    const sec = section.current;
    if (!sec) return;
    const top = sec.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + (i / (STOPS.length - 1)) * (sec.offsetHeight - window.innerHeight));
  };
  const skip = () => {
    const sec = section.current;
    if (sec) scrollToY(sec.getBoundingClientRect().bottom + window.scrollY - 56);
  };

  if (plain) {
    return (
      <section aria-label="Places in Faridabad" className="mx-auto max-w-[1100px] px-4 py-14 lg:px-8">
        <h2 className="display text-4xl">Seven stops across the city</h2>
        <ul className="mt-8 grid gap-10">
          {STOPS.map((s) => (
            <li key={s.slug}>
              <Image src={s.src} alt={s.name} width={s.width} height={s.height} className="max-h-[70vh] w-full object-cover" sizes="(max-width: 1100px) 100vw, 1100px" />
              <h3 className="display mt-3 text-2xl">{s.name}</h3>
              <p className="max-w-prose text-muted">{s.blurb}</p>
              <Link href={s.cta.href} className="link font-semibold">
                {s.cta.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const stop = STOPS[active];

  return (
    <section ref={section} aria-label="Seven stops across Faridabad" style={{ height: `${STOPS.length * 95 + 30}svh` }} className="relative bg-night">
      <div className="on-night sticky top-0 h-svh overflow-hidden text-white">
        <div className="absolute inset-0">
          <Image src={STOPS[0].src} alt="" fill sizes="100vw" className="object-cover" style={{ objectPosition: "50% 42%" }} />
        </div>
        <canvas ref={canvas} aria-hidden="true" className={`absolute inset-0 size-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(5_42_31/0.82),rgb(5_42_31/0.16)_46%,transparent_70%)]" />

        <h2 className="sr-only">Seven stops across the city</h2>

        {/* Road running down the side: where you are on the tour, and a way to jump. */}
        <nav aria-label="Stops" className="absolute right-4 top-1/2 hidden -translate-y-1/2 lg:right-8 lg:block">
          <ol className="relative grid justify-items-end gap-1 rounded-lg bg-night/60 p-2 backdrop-blur-sm">
            {STOPS.map((s, i) => (
              <li key={s.slug}>
                <button type="button" onClick={() => jumpTo(i)} aria-current={i === active ? "step" : undefined} className={`flex items-center gap-3 rounded px-2 py-0.5 text-right font-semibold transition-opacity hover:opacity-100 ${i === active ? "opacity-100" : "opacity-75"}`}>
                  {s.name}
                  <span className={`block size-3 rounded-full border-2 border-white transition-colors ${i === active ? "bg-mark" : "bg-transparent"}`} />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="absolute inset-x-0 bottom-0 top-14 flex flex-col justify-end px-4 pb-20 lg:top-auto lg:block lg:px-8 lg:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-h-[220px] max-w-2xl" aria-live="polite">
              <motion.div key={stop.slug} initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="plate inline-block px-6 pb-4 pt-5 shadow-[0_14px_40px_rgb(0_0_0/0.38)]">
                    <p className="hi text-xl leading-none">{stop.hi}</p>
                    <p className="display mt-1 text-[clamp(1.9rem,5vw,3.9rem)]">{stop.name}</p>
                    <p className="text-[0.95rem] opacity-90">{stop.area}</p>
                  </div>
                  <p className="mt-3 max-w-xl text-[1.08rem] drop-shadow-[0_1px_6px_rgb(0_0_0/0.75)]">{stop.blurb}</p>
                  <Link href={stop.cta.href} className="btn btn-mark mt-3">
                    {stop.cta.label}
                  </Link>
                </motion.div>
            </div>
            <button type="button" onClick={skip} className="btn-ghost btn absolute right-3 top-[-1px] font-semibold drop-shadow-[0_1px_4px_rgb(0_0_0/0.9)] lg:static">
              Skip the tour
            </button>
          </div>
        </div>

        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[5px] overflow-hidden">
          <div ref={bar} className="dashes-v h-full origin-top" style={{ transform: "scaleY(0)" }} />
        </div>
      </div>
    </section>
  );
}
