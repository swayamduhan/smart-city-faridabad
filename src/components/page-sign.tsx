import type { ReactNode } from "react";

/** Page heading set as a direction sign: Hindi above English, as on Indian roads. */
export function PageSign({ title, hi, children, aside, wide }: { title: string; hi: string; children?: ReactNode; aside?: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto px-2 pt-2 sm:px-3 ${wide ? "max-w-[1600px]" : "max-w-[1600px]"}`}>
      <div className="plate on-sign grid gap-6 px-6 pb-7 pt-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10 lg:pb-9">
        <div>
          <p className="hi text-[clamp(1.3rem,2.6vw,2.2rem)] leading-tight">{hi}</p>
          <h1 className="display text-[clamp(2.6rem,7.5vw,6.5rem)] leading-[0.98]">{title}</h1>
          {children && <div className="mt-3 max-w-[60ch] text-[1.08rem] leading-snug">{children}</div>}
        </div>
        {aside && <div className="lg:pb-2">{aside}</div>}
      </div>
    </div>
  );
}

export function SampleNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[0.95rem] text-muted">{children}</p>;
}
