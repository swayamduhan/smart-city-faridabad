import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSign, SampleNote } from "@/components/page-sign";
import { getDb } from "@/lib/db";
import { dateShort } from "@/lib/format";

export const metadata: Metadata = { title: "Ward details" };

const money = (lakh: number) => (lakh >= 100 ? `₹${(lakh / 100).toFixed(1)} crore` : `₹${lakh} lakh`);

export default async function WardPage({ params }: PageProps<"/wards/[number]">) {
  const { number } = await params;
  const db = getDb();
  const ward = db.wards.find((w) => w.number === Number(number));
  if (!ward) notFound();
  const elected = db.candidates.find((c) => c.ward === ward.number && c.status === "elected");
  const standing = db.candidates.filter((c) => c.ward === ward.number && c.status === "standing");
  const open = db.reports.filter((r) => r.ward === ward.number && r.status !== "resolved").length;

  return (
    <>
      <PageSign title={`Ward ${ward.number}`} hi={`वार्ड ${ward.number}`} aside={<Link href="/wards" className="btn btn-line">All wards</Link>}>
        {ward.name}. {ward.voters.toLocaleString("en-IN")} voters, {open} open {open === 1 ? "problem" : "problems"}.
      </PageSign>
      <div className="mx-auto max-w-[1200px] px-4 pt-8 lg:px-8">
        {elected && (
          <section aria-labelledby="elected" className="grid gap-6 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 id="elected" className="text-muted">
                Your elected councillor
              </h2>
              <p className="display text-[clamp(2rem,5vw,3.6rem)]">{elected.name}</p>
              <p className="text-lg font-semibold">{elected.party}</p>
              <p className="text-muted">
                Age {elected.age}, {elected.education}, {elected.occupation.toLowerCase()}
              </p>
            </div>
            <dl className="grid grid-cols-2 content-start gap-4">
              <div className="border-t-2 border-ink pt-2">
                <dt className="text-muted">Meetings attended</dt>
                <dd className="display text-4xl tabular-nums">{elected.attendance}%</dd>
              </div>
              <div className="border-t-2 border-ink pt-2">
                <dt className="text-muted">Ward funds used</dt>
                <dd className="display text-4xl tabular-nums">{elected.fundsUsed}%</dd>
              </div>
            </dl>
          </section>
        )}

        <section aria-labelledby="standing" className="mt-14">
          <h2 id="standing" className="display text-[clamp(2rem,4vw,3.2rem)]">
            Standing on {dateShort(ward.electionDate)}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b-2 border-ink align-bottom">
                  <th scope="col" className="w-40 py-2 pr-4 font-bold text-muted">
                    Compare
                  </th>
                  {standing.map((c) => (
                    <th key={c.id} scope="col" className="py-2 pr-4">
                      <span className="display block text-xl leading-tight">{c.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Party", (c) => c.party],
                    ["Age", (c) => c.age],
                    ["Education", (c) => c.education],
                    ["Occupation", (c) => c.occupation],
                    ["Declared assets", (c) => money(c.assetsLakh)],
                  ] as [string, (c: (typeof standing)[number]) => React.ReactNode][]
                ).map(([label, get]) => (
                  <tr key={label} className="border-b border-line">
                    <th scope="row" className="py-2 pr-4 text-left font-semibold text-muted">
                      {label}
                    </th>
                    {standing.map((c) => (
                      <td key={c.id} className="py-2 pr-4">
                        {get(c)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-line align-top">
                  <th scope="row" className="py-2 pr-4 text-left font-semibold text-muted">
                    Promises
                  </th>
                  {standing.map((c) => (
                    <td key={c.id} className="py-2 pr-4">
                      <ul className="grid gap-1.5 text-[0.98rem]">
                        {c.promises.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <SampleNote>All candidates and figures on this page are invented for this demo. None of these are real people.</SampleNote>
      </div>
    </>
  );
}
