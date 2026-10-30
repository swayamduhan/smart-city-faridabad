"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { RoadArrow } from "./road-arrow";
import { SearchBox } from "./search-box";
import { useCityNow } from "./use-city-now";
import { DIRECTION_LABEL, STATIONS, metroArrivals } from "@/lib/transit-sim";
import type { RoadArrow as Dir } from "@/lib/nav";

export interface Destination {
  href: string;
  label: string;
  hi: string;
  arrow: Dir;
  /** Sits where a road sign would show the distance. */
  value: string;
}

const easeOut = [0.22, 1, 0.36, 1] as const;
const OLD_FBD = STATIONS.findIndex((s) => s.name === "Old Faridabad");

function NextMetro() {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => {
      const a = metroArrivals(Math.max(OLD_FBD, 0), Date.now(), 1).filter((x) => x.direction === "south")[0];
      setText(`Metro to ${DIRECTION_LABEL.south} in ${a.minutes === 0 ? "under 1" : a.minutes} min`);
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, []);
  return <>{text || "Metro times loading"}</>;
}

export function Hero({ destinations }: { destinations: Destination[] }) {
  const reduced = useReducedMotion();
  const { now, failed } = useCityNow();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -70]);

  return (
    <section ref={ref} className="on-sign relative bg-ground [perspective:1400px]" aria-label="Faridabad">
      {/* Mounted like a roadside sign: it swings down once on load and settles. */}
      <motion.div
        className="plate relative z-10 mx-2 mb-0 flex min-h-[calc(100svh-3.5rem-3.25rem)] origin-top flex-col rounded-t-none px-5 pb-5 pt-5 sm:mx-3 sm:px-8 lg:px-10 lg:pb-7"
        style={{ y }}
        initial={{ rotateX: -16, y: -40, opacity: 0.2 }}
        animate={{ rotateX: 0, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 70, damping: 11, mass: 0.9 }}
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-1">
          <p className="hi text-[clamp(2.2rem,5.6vw,5.4rem)] font-semibold leading-[1.3]">फरीदाबाद</p>
          <p className="max-w-[26rem] pb-2 text-[1.08rem] leading-snug">Pay bills, report problems and find what you need in the city, from one place.</p>
        </div>
        <h1 className="display -mt-1 text-[15.6vw] lg:text-[min(17.6vw,23rem)] leading-[0.9] tracking-[-0.03em]">Faridabad</h1>

        <div className="relative z-20 mt-4 max-w-4xl lg:mt-5">
          <SearchBox placeholder="What do you need? Try “water bill” or “Sector 15”" />
        </div>

        <ul className="mt-5 grid flex-1 grid-cols-[minmax(0,1fr)] content-end gap-x-12 md:grid-cols-2 xl:grid-cols-3">
          {destinations.map((d, i) => (
            <motion.li key={d.href} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05, duration: 0.5, ease: easeOut }} className="border-t border-white/25">
              <Link href={d.href} className="group flex items-center gap-2 py-2.5 hover:text-mark sm:gap-3">
                <RoadArrow dir={d.arrow} className="size-6 shrink-0 transition-transform sm:size-7 duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-110" />
                <span className="display whitespace-nowrap text-[clamp(1.1rem,1.75vw,1.65rem)]">{d.label}</span>
                <span className="hi hidden text-base opacity-85 2xl:inline">{d.hi}</span>
                <span className="ml-auto whitespace-nowrap pl-2 text-[0.92rem] font-semibold tabular-nums sm:pl-3 sm:text-[1.05rem]">{d.value}</span>
              </Link>
            </motion.li>
          ))}
        </ul>

        <div className="board led-on mt-3 flex flex-wrap items-center gap-x-8 gap-y-0.5 px-4 pb-1.5 pt-2.5 [animation-delay:1s]" aria-label="Live city status">
          {failed && !now ? (
            <span className="led text-lg sm:text-2xl">Weather feed is offline</span>
          ) : (
            <>
              <span className="led text-lg sm:text-2xl">{now ? `${now.temperature}°C ${now.sky}` : "Reading weather"}</span>
              <span className="led text-lg sm:text-2xl">{now ? `AQI ${now.aqi} ${now.aqiLabel}` : "Reading air quality"}</span>
            </>
          )}
          <span className="led text-lg sm:text-2xl">
            <NextMetro />
          </span>
          <span className="ml-auto text-xs text-white/60">Weather and AQI live. Metro time simulated.</span>
        </div>
      </motion.div>

      {/* Sign posts run down to the road, which is where the tour starts. */}
      <div aria-hidden="true" className="relative mx-auto flex h-[3.25rem] max-w-[62%] justify-between bg-transparent">
        <span className="block h-full w-3.5 bg-[linear-gradient(90deg,#6c7a73,#b6c2bb_45%,#6c7a73)]" />
        <span className="block h-full w-3.5 bg-[linear-gradient(90deg,#6c7a73,#b6c2bb_45%,#6c7a73)]" />
      </div>
    </section>
  );
}
