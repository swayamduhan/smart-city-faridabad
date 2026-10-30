import type { Metadata } from "next";
import { CityLive } from "@/components/city-live";
import { PageSign } from "@/components/page-sign";
import { getDb } from "@/lib/db";
import { dateShort } from "@/lib/format";

export const metadata: Metadata = { title: "City info" };

const FACTS = [
  { value: "14,14,050", label: "People, 2011 census", note: "The last full census" },
  { value: "14,70,666", label: "Registered voters, 2025", note: "Municipal election roll" },
  { value: "46", label: "Municipal wards", note: "Up from 40 before delimitation" },
  { value: "83.83%", label: "Literacy, 2011", note: "People aged 7 and above" },
  { value: "874", label: "Women per 1,000 men, 2011", note: "Sex ratio" },
  { value: "204 km²", label: "City area", note: "Corporation limits vary by source" },
];

const HELPLINES = [
  ["112", "All emergencies"],
  ["100", "Police"],
  ["101", "Fire"],
  ["102", "Ambulance"],
  ["1091", "Women's helpline"],
  ["1098", "Child helpline"],
];

const KIND = { notice: { label: "Notice", cls: "status-submitted" }, alert: { label: "Alert", cls: "bg-alert text-white" }, event: { label: "Event", cls: "status-acknowledged" } } as const;

export default function CityPage() {
  const { announcements } = getDb();
  return (
    <>
      <PageSign title="City info" hi="शहर की जानकारी">
        Founded in 1607 by Shaikh Farid, treasurer to the Mughal emperor Jahangir, to guard the Grand Trunk Road. Today it&apos;s one of Haryana&apos;s largest cities and an industrial hub.
      </PageSign>
      <div className="mx-auto max-w-[1400px] px-4 pt-10 lg:px-8">
        <section aria-labelledby="now">
          <h2 id="now" className="display text-[clamp(2rem,4vw,3.2rem)]">
            Right now
          </h2>
          <CityLive />
        </section>

        <section aria-labelledby="facts" className="mt-14">
          <h2 id="facts" className="display text-[clamp(2rem,4vw,3.2rem)]">
            The city in numbers
          </h2>
          <dl className="mt-5 grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.label} className="border-t-2 border-ink py-3">
                <dd className="display text-[clamp(2.4rem,5vw,4rem)] tabular-nums">{f.value}</dd>
                <dt className="font-semibold">{f.label}</dt>
                <dd className="text-[0.95rem] text-muted">{f.note}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <section aria-labelledby="notices">
            <h2 id="notices" className="display text-[clamp(2rem,4vw,3.2rem)]">
              Notices
            </h2>
            <ul className="mt-4 border-t-2 border-ink">
              {announcements.map((a) => (
                <li key={a.id} className="border-b border-line py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip ${KIND[a.kind].cls}`}>{KIND[a.kind].label}</span>
                    <span className="text-[0.92rem] text-muted">
                      {dateShort(a.publishedAt)}
                      {a.ward ? `, ward ${a.ward}` : ", citywide"}
                    </span>
                  </div>
                  <h3 className="mt-1 text-xl font-bold leading-snug">{a.title}</h3>
                  <p className="mt-0.5 max-w-[65ch] text-muted">{a.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.95rem] text-muted">Notices are sample data for this demo.</p>
          </section>
          <section aria-labelledby="help">
            <h2 id="help" className="display text-[clamp(2rem,4vw,3.2rem)]">
              Emergency numbers
            </h2>
            <ul className="mt-4 border-t-2 border-ink">
              {HELPLINES.map(([num, label]) => (
                <li key={num} className="border-b border-line">
                  <a href={`tel:${num}`} className="row-link flex items-baseline justify-between gap-4 px-1 py-2.5">
                    <span className="font-semibold">{label}</span>
                    <span className="display text-3xl tabular-nums">{num}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
