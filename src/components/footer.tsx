import Link from "next/link";
import { NAV } from "@/lib/nav";
import { FooterSign } from "./footer-sign";

export function Footer() {
  return (
    <footer className="on-night mt-20 bg-night pt-12 text-white no-print">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 pb-10 md:grid-cols-[1.2fr_2fr] lg:px-8">
        <div className="max-w-md">
          <p className="display text-2xl">Faridabad, in one place</p>
          <p className="mt-3 text-white/80">
            A college demo. Bills, payments, candidates, jobs and live vehicle positions are simulated, and no money moves. Map, places, weather and air quality use real public data.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="py-1 font-semibold hover:text-mark">
              {n.label}
              <span className="hi block text-sm font-normal text-white/70 sm:ml-2 sm:inline">{n.hi}</span>
            </Link>
          ))}
          <Link href="/account" className="py-1 font-semibold hover:text-mark">
            Your account
          </Link>
          <Link href="/credits" className="py-1 font-semibold hover:text-mark">
            Photo and data credits
          </Link>
        </nav>
      </div>
      <FooterSign />
    </footer>
  );
}
