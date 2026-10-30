"use client";

import { useRef, useState } from "react";
import { rupees } from "@/lib/bills";
import { formatLakh } from "./format-lakh";

/** Single-series daily trend with a crosshair tooltip. The chart title names the series, so no legend. */
export function TrendChart({ data, unit }: { data: { date: string; value: number }[]; unit: string }) {
  const format = formatLakh;
  const W = 760;
  const H = 240;
  const PAD = { l: 58, r: 12, t: 12, b: 26 };
  const box = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const nice = Math.ceil(max / 10 ** Math.floor(Math.log10(max))) * 10 ** Math.floor(Math.log10(max));
  const x = (i: number) => PAD.l + (i / Math.max(data.length - 1, 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / nice) * (H - PAD.t - PAD.b);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join("");
  const area = `${path}L${x(data.length - 1)} ${H - PAD.b}L${x(0)} ${H - PAD.b}Z`;
  const ticks = [0, nice / 2, nice];
  const every = Math.ceil(data.length / 6);
  const label = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const onMove = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  const h = hover === null ? null : data[hover];

  return (
    <div className="relative">
      <svg ref={box} viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`Daily ${unit} trend over ${data.length} days. Peak ${format(max)}.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--color-muted)">
              {format(t)}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--color-sign)" opacity={0.1} />
        <path d={path} fill="none" stroke="var(--color-sign)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) =>
          i % every === 0 ? (
            <text key={d.date} x={x(i)} y={H - 7} textAnchor="middle" fontSize={12} fill="var(--color-muted)">
              {label(d.date)}
            </text>
          ) : null,
        )}
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(h.value)} r={5} fill="var(--color-sign)" stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && h && (
        <div className="pointer-events-none absolute top-1 rounded bg-night px-2.5 py-1 text-[0.92rem] text-white" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "-105%" : "5%"})` }}>
          <span className="block font-bold tabular-nums">{format(h.value)}</span>
          {label(h.date)}
        </div>
      )}
      <details className="mt-1 text-[0.95rem]">
        <summary className="cursor-pointer text-muted">Show as a table</summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="py-1">
                  Date
                </th>
                <th scope="col" className="py-1 text-right">
                  {unit}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-b border-line">
                  <td className="py-0.5">{label(d.date)}</td>
                  <td className="py-0.5 text-right tabular-nums">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Sorted horizontal bars, labelled directly, so colour never has to carry identity. */
export function BarList({ rows, money }: { rows: { label: string; value: number }[]; money?: boolean }) {
  const format = money ? rupees : (n: number) => n.toLocaleString("en-IN");
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((n, r) => n + r.value, 0) || 1;
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${format(r.value)}, ${Math.round((r.value / total) * 100)}% of total`}>
          <div className="flex items-baseline justify-between gap-3 text-[0.98rem]">
            <span>{r.label}</span>
            <span className="tabular-nums">
              <span className="mr-2 text-[0.88rem] text-muted opacity-0 transition-opacity group-hover:opacity-100">{Math.round((r.value / total) * 100)}%</span>
              <span className="font-bold">{format(r.value)}</span>
            </span>
          </div>
          <div className="mt-0.5 h-2 bg-line/60">
            <div className="h-full rounded-r-[4px] bg-sign transition-colors group-hover:bg-sign-deep" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
