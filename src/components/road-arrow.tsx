import type { RoadArrow as Dir } from "@/lib/nav";

const ANGLE: Record<Dir, number> = { up: 0, "up-right": 45, right: 90, "up-left": -45, left: -90 };

/** The chunky arrow used on Indian direction signs: wide head, straight shaft. */
export function RoadArrow({ dir = "up", className = "size-6" }: { dir?: Dir; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ transform: `rotate(${ANGLE[dir]}deg)` }} aria-hidden="true" fill="currentColor">
      <path d="M12 1.5 21.5 12.5h-6V22.5h-7V12.5h-6z" />
    </svg>
  );
}
