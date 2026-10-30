"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

const FRAMES = [
  { src: "/images/lamps.jpg", w: 1800, h: 2598, title: "Lamp stalls at the mela", where: "Surajkund Mela grounds", href: "/map?q=Surajkund", tall: true, pos: "50% 38%" },
  { src: "/images/charminar.jpg", w: 1040, h: 780, title: "The mela's Charminar gate", where: "Surajkund", href: "/map?q=Surajkund", tall: false, pos: "50% 50%" },
  { src: "/images/folk.jpg", w: 1800, h: 1200, title: "Folk performers in the lanes", where: "Surajkund Mela grounds", href: "/city", tall: false, pos: "45% 40%" },
  { src: "/images/kundsteps.jpg", w: 1800, h: 1200, title: "Walk down the old stone steps", where: "Surajkund reservoir", href: "/map?q=Surajkund", tall: true, pos: "50% 60%" },
  { src: "/images/station.jpg", w: 1727, h: 711, title: "The platform at Ballabhgarh station", where: "Ballabhgarh", href: "/map?q=Ballabhgarh%20railway%20station", tall: false, pos: "50% 50%" },
];

function Frame({ f, index, travel }: { f: (typeof FRAMES)[number]; index: number; travel: ReturnType<typeof useTransform<number, number>> }) {
  const inner = useTransform(travel, (v) => `${(v * (index % 2 ? -1 : 1)) / 60}%`);
  return (
    <Link href={f.href} className={`group relative flex shrink-0 snap-center flex-col ${f.tall ? "h-[64svh] w-[78vw] sm:w-[44vh] lg:h-[86%]" : "h-[46svh] w-[84vw] sm:w-[66vh] lg:h-[62%]"} ${index % 2 ? "lg:self-end" : "lg:self-start"}`}>
      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
        <motion.div className="absolute -inset-x-[8%] inset-y-0" style={{ x: inner }}>
          <Image src={f.src} alt={f.title} fill sizes="(max-width: 1024px) 84vw, 50vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]" style={{ objectPosition: f.pos }} />
        </motion.div>
      </div>
      <div className="mt-2">
        <p className="display text-xl leading-tight group-hover:underline">{f.title}</p>
        <p className="text-[0.95rem] text-white/75">{f.where}</p>
      </div>
    </Link>
  );
}

/** Sticky horizontal gallery on large screens, a plain swipeable strip on phones. */
export function VisitorStrip() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [desktop, setDesktop] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setDesktop(mq.matches);
      if (track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const eased = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });
  const x = useTransform(eased, [0, 1], [0, -distance]);
  const travel = useTransform(eased, [0, 1], [0, 100]);
  const [pct, setPct] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setPct(v));
  const pinned = desktop && !reduced;

  return (
    <section ref={section} aria-labelledby="visitors" className={`on-night bg-night text-white ${pinned ? "h-[340svh]" : ""}`}>
      <div className={pinned ? "sticky top-0 flex h-svh flex-col overflow-hidden pb-6 pt-20" : "py-12"}>
        <div className="flex items-end justify-between gap-6 px-4 lg:px-8">
          <h2 id="visitors" className="display text-[clamp(2rem,5vw,4.2rem)]">
            Where to take visitors
          </h2>
          <Link href="/places" className="link hidden shrink-0 font-semibold sm:block">
            All places
          </Link>
        </div>
        <motion.div ref={track} style={pinned ? { x } : undefined} className={`mt-8 flex gap-[5vw] px-4 lg:px-8 ${pinned ? "min-h-0 w-max flex-1" : "scroll-x snap-x snap-mandatory items-start"}`}>
          {FRAMES.map((f, i) => (
            <Frame key={f.src} f={f} index={i} travel={travel} />
          ))}
        </motion.div>
        {pinned && (
          <div aria-hidden="true" className="mx-8 mt-4 h-[5px] overflow-hidden bg-white/10">
            <div className="dashes h-full origin-left" style={{ transform: `scaleX(${pct})` }} />
          </div>
        )}
      </div>
    </section>
  );
}
