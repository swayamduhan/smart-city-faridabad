"use client";

import { useEffect, useRef, useState } from "react";
import type Matter from "matter-js";

const WORD = "FARIDABAD";
type Phase = "intact" | "damaged" | "reporting" | "repairing" | "repaired";

interface Letter {
  el: HTMLSpanElement;
  body: Matter.Body;
  home: { x: number; y: number };
  pins: Matter.Constraint[];
  bolts: HTMLElement[];
  lastHit: number;
}

/**
 * The city's name hangs from a gantry by two bolts per letter. Brush a letter and a bolt shears,
 * so it swings; hit it again and it drops. Then you can report the damage, and the crew bolts it back.
 */
export function FooterSign() {
  const stage = useRef<HTMLDivElement>(null);
  const letterEls = useRef<HTMLSpanElement[]>([]);
  const [phase, setPhase] = useState<Phase>("intact");
  const [fallen, setFallen] = useState(0);
  const api = useRef<{ repair: () => void; shake: () => void } | null>(null);

  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const M = (await import("matter-js")).default;
      await document.fonts.ready;
      if (cancelled) return;

      const engine = M.Engine.create({ gravity: { x: 0, y: 1.25 }, enableSleeping: true });
      let letters: Letter[] = [];
      let cursor: Matter.Body | null = null;
      let walls: Matter.Body[] = [];
      let raf = 0;
      let visible = false;
      let last = 0;
      let repairing = 0;
      const pointer = { x: -999, y: -999, seen: false };

      const measure = () => {
        // Use font metrics to box just the capital, not the whole line, so letters land on their feet.
        const box = container.getBoundingClientRect();
        const sample = letterEls.current[0];
        const size = parseFloat(getComputedStyle(sample).fontSize);
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.font = `800 ${size}px ${getComputedStyle(sample).fontFamily}`;
        const m = ctx.measureText("H");
        const capH = m.actualBoundingBoxAscent;
        const lineH = sample.getBoundingClientRect().height;
        const baseline = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        return { box, capH, baseline };
      };

      const build = () => {
        M.Composite.clear(engine.world, false, true);
        const { box, capH, baseline } = measure();
        const thickness = 400;
        walls = [
          M.Bodies.rectangle(box.width / 2, box.height + thickness / 2, box.width * 2, thickness, { isStatic: true, friction: 0.9 }),
          M.Bodies.rectangle(-thickness / 2, box.height / 2, thickness, box.height * 3, { isStatic: true }),
          M.Bodies.rectangle(box.width + thickness / 2, box.height / 2, thickness, box.height * 3, { isStatic: true }),
        ];
        cursor = M.Bodies.circle(-999, -999, Math.max(16, box.width * 0.022), { isStatic: true, label: "cursor" });
        M.Composite.add(engine.world, [...walls, cursor]);

        letters = letterEls.current.map((el) => {
          el.style.transform = "";
          const r = el.getBoundingClientRect();
          const w = r.width;
          const x = r.left - box.left + w / 2;
          const y = r.top - box.top + baseline - capH / 2;
          el.style.transformOrigin = `50% ${baseline - capH / 2}px`;
          const body = M.Bodies.rectangle(x, y, w * 0.94, capH, { restitution: 0.14, friction: 0.7, frictionAir: 0.012, density: 0.002, chamfer: { radius: 3 }, slop: 0.02 });
          const bolts = Array.from(el.querySelectorAll<HTMLElement>("[data-bolt]"));
          const pins = [-1, 1].map((side) =>
            M.Constraint.create({
              bodyA: body,
              pointA: { x: (side * w) / 3.2, y: -capH / 2 },
              pointB: { x: x + (side * w) / 3.2, y: y - capH / 2 },
              length: 0,
              stiffness: 1,
              damping: 0.3,
            }),
          );
          M.Composite.add(engine.world, [body, ...pins]);
          return { el, body, home: { x, y }, pins, bolts, lastHit: 0 };
        });
      };

      const shear = (l: Letter, pin: Matter.Constraint, index: number) => {
        M.Composite.remove(engine.world, pin);
        l.pins = l.pins.filter((p) => p !== pin);
        M.Sleeping.set(l.body, false);
        l.bolts[index]?.setAttribute("data-sheared", "true");
      };

      const hit = (l: Letter, now: number, nudge: number) => {
        if (!l.pins.length || now - l.lastHit < 240) return;
        l.lastHit = now;
        const side = pointer.x < l.body.position.x ? 0 : 1;
        const pin = l.pins.length === 2 ? l.pins[side] : l.pins[0];
        const original = l.pins.length === 2 ? side : l.bolts.findIndex((b) => !b.hasAttribute("data-sheared"));
        shear(l, pin, original);
        M.Body.applyForce(l.body, { x: l.body.position.x, y: l.body.position.y + 8 }, { x: nudge * 0.012 * l.body.mass, y: 0 });
        setPhase((p) => (p === "intact" || p === "repaired" ? "damaged" : p));
        setFallen(letters.filter((x) => x.pins.length === 0).length);
      };

      const step = (time: number) => {
        raf = requestAnimationFrame(step);
        if (!visible) return;
        const dt = Math.min(time - last || 16, 32);
        last = time;

        if (cursor && pointer.seen) {
          const prev = { x: cursor.position.x, y: cursor.position.y };
          const speed = Math.hypot(pointer.x - prev.x, pointer.y - prev.y);
          // Keep the pointer's push gentle; a teleporting body inside a letter would fling it off screen.
          const push = Math.min(1, 14 / Math.max(speed, 1));
          M.Body.setVelocity(cursor, { x: (pointer.x - prev.x) * push, y: (pointer.y - prev.y) * push });
          M.Body.setPosition(cursor, { x: pointer.x, y: pointer.y });
          for (const l of letters) {
            const b = l.body.bounds;
            if (pointer.x > b.min.x && pointer.x < b.max.x && pointer.y > b.min.y && pointer.y < b.max.y) {
              hit(l, time, Math.sign(pointer.x - prev.x || 1) * Math.min(1 + speed / 10, 3));
            }
          }
        }

        if (repairing) {
          const u = Math.min(1, (time - repairing) / 1300);
          const ease = 1 - (1 - u) ** 3;
          for (const l of letters) {
            const { x, y } = l.body.position;
            M.Body.setPosition(l.body, { x: x + (l.home.x - x) * ease * 0.3, y: y + (l.home.y - y) * ease * 0.3 });
            M.Body.setAngle(l.body, l.body.angle * (1 - ease * 0.3));
            M.Body.setVelocity(l.body, { x: 0, y: 0 });
            M.Body.setAngularVelocity(l.body, 0);
          }
          if (u >= 1) {
            repairing = 0;
            for (const l of letters) {
              M.Body.setPosition(l.body, l.home);
              M.Body.setAngle(l.body, 0);
              const w = l.body.bounds.max.x - l.body.bounds.min.x;
              const capH = l.body.bounds.max.y - l.body.bounds.min.y;
              l.pins = [-1, 1].map((side) =>
                M.Constraint.create({ bodyA: l.body, pointA: { x: (side * w) / 3.2, y: -capH / 2 }, pointB: { x: l.home.x + (side * w) / 3.2, y: l.home.y - capH / 2 }, length: 0, stiffness: 1, damping: 0.3 }),
              );
              M.Composite.add(engine.world, [l.body, ...l.pins]);
              l.bolts.forEach((bolt) => bolt.removeAttribute("data-sheared"));
            }
            setFallen(0);
            setPhase("repaired");
          }
        } else {
          M.Engine.update(engine, dt);
          const { width, height } = container.getBoundingClientRect();
          for (const l of letters) {
            const v = l.body.velocity;
            const speed = Math.hypot(v.x, v.y);
            if (speed > 26) M.Body.setVelocity(l.body, { x: (v.x / speed) * 26, y: (v.y / speed) * 26 });
            // A hard pointer flick can still shove a letter through a wall. Drop it back in from above.
            const { x, y } = l.body.position;
            if (x < -40 || x > width + 40 || y > height + 60 || y < -height) {
              M.Body.setPosition(l.body, { x: Math.min(width - 90, Math.max(90, l.home.x)), y: 40 });
              M.Body.setVelocity(l.body, { x: 0, y: 0 });
              M.Body.setAngularVelocity(l.body, 0);
            }
          }
        }

        for (const l of letters) {
          const dx = l.body.position.x - l.home.x;
          const dy = l.body.position.y - l.home.y;
          l.el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) rotate(${l.body.angle.toFixed(4)}rad)`;
        }
      };

      const toLocal = (clientX: number, clientY: number) => {
        const r = container.getBoundingClientRect();
        pointer.x = clientX - r.left;
        pointer.y = clientY - r.top;
        pointer.seen = true;
      };
      const onMove = (e: PointerEvent) => toLocal(e.clientX, e.clientY);
      const onDown = (e: PointerEvent) => {
        toLocal(e.clientX, e.clientY);
        for (const l of letters) {
          const b = l.body.bounds;
          if (pointer.x > b.min.x && pointer.x < b.max.x && pointer.y > b.min.y && pointer.y < b.max.y) hit(l, performance.now(), 1);
        }
      };
      const onLeave = () => {
        pointer.seen = false;
        if (cursor) M.Body.setPosition(cursor, { x: -999, y: -999 });
      };

      container.addEventListener("pointermove", onMove);
      container.addEventListener("pointerdown", onDown);
      container.addEventListener("pointerleave", onLeave);

      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.05 });
      io.observe(container);

      let resizeTimer: ReturnType<typeof setTimeout>;
      let lastWidth = container.clientWidth;
      const ro = new ResizeObserver(() => {
        if (container.clientWidth === lastWidth) return;
        lastWidth = container.clientWidth;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          build();
          setPhase("intact");
          setFallen(0);
          letters.forEach((l) => l.bolts.forEach((b) => b.removeAttribute("data-sheared")));
        }, 200);
      });
      ro.observe(container);

      build();
      raf = requestAnimationFrame(step);

      api.current = {
        repair: () => {
          for (const l of letters) {
            for (const p of l.pins) M.Composite.remove(engine.world, p);
            l.pins = [];
          }
          repairing = performance.now();
        },
        shake: () => {
          letters.forEach((l, i) => {
            setTimeout(() => {
              [...l.pins].forEach((p) => shear(l, p, l.bolts.findIndex((b) => !b.hasAttribute("data-sheared"))));
              M.Body.applyForce(l.body, l.body.position, { x: (i - 4) * 0.0009 * l.body.mass, y: -0.002 * l.body.mass });
              setFallen(letters.filter((x) => x.pins.length === 0).length);
            }, i * 70);
          });
          setPhase("damaged");
        },
      };

      cleanup = () => {
        cancelAnimationFrame(raf);
        clearTimeout(resizeTimer);
        io.disconnect();
        ro.disconnect();
        container.removeEventListener("pointermove", onMove);
        container.removeEventListener("pointerdown", onDown);
        container.removeEventListener("pointerleave", onLeave);
        M.Engine.clear(engine);
        api.current = null;
        letterEls.current.forEach((el) => (el.style.transform = ""));
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const report = () => {
    setPhase("reporting");
    setTimeout(() => {
      setPhase("repairing");
      api.current?.repair();
    }, 1500);
  };

  const message: Record<Phase, string> = {
    intact: "This sign is held up by 18 bolts. Please do not touch it.",
    damaged: fallen === 0 ? "A bolt has sheared. The sign is now swinging." : `${fallen} of ${WORD.length} letters ${fallen === 1 ? "has" : "have"} fallen onto the road.`,
    reporting: "Complaint filed. Crew assigned to the footer.",
    repairing: "Crew on site. Bolting the sign back up.",
    repaired: "Repaired in under 3 seconds. A city record.",
  };

  return (
    <div className="relative">
      <div className="pointer-events-none relative z-10 flex min-h-[122px] flex-wrap content-start items-center justify-between gap-3 px-4 sm:min-h-[46px] lg:px-8">
        <p className="led text-lg leading-tight sm:text-2xl" role="status">
          {message[phase]}
        </p>
        <div className="pointer-events-auto flex gap-2">
          {phase === "damaged" && (
            <button type="button" onClick={report} className="btn btn-mark">
              Report this damage
            </button>
          )}
          {(phase === "intact" || phase === "repaired") && (
            <button type="button" onClick={() => api.current?.shake()} className="btn btn-line sr-only focus:not-sr-only">
              Knock the sign down
            </button>
          )}
        </div>
      </div>
      <div ref={stage} className="relative mt-4 h-[31vw] min-h-[180px] max-h-[470px] touch-pan-y select-none overflow-hidden">
        <div aria-hidden="true" className="absolute inset-x-0 top-[5%] h-[10px] bg-[#8b9a93] shadow-[0_4px_0_rgb(0_0_0/0.25)]" />
        <div className="absolute inset-x-0 top-[5%] flex justify-center px-[1.5vw] pt-[10px]" role="img" aria-label="Faridabad">
          {WORD.split("").map((ch, i) => (
            <span
              key={i}
              ref={(el) => {
                if (el) letterEls.current[i] = el;
              }}
              className="relative block font-display text-[min(18.4vw,300px)] font-extrabold leading-[1] text-mark will-change-transform"
              style={{ fontStretch: "100%", fontVariationSettings: '"wdth" 100' }}
              aria-hidden="true"
            >
              {ch}
              <i data-bolt className="footer-bolt left-[18%]" />
              <i data-bolt className="footer-bolt right-[18%]" />
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="dashes absolute inset-x-0 bottom-0" />
      </div>
    </div>
  );
}
