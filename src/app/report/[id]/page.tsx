import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PinMap } from "@/components/pin-map";
import { getDb } from "@/lib/db";
import { CATEGORY_LABEL, STATUS_LABEL, dateTime } from "@/lib/format";
import type { IssueStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Track a report" };

const LADDER: IssueStatus[] = ["submitted", "acknowledged", "in_progress", "resolved"];

export default async function ReportDetail({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;
  const r = getDb().reports.find((x) => x.id === id);
  if (!r) notFound();
  const reached = LADDER.indexOf(r.status);
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-8 lg:px-8">
      <Link href="/report" className="link font-semibold">
        All reports
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="display text-[clamp(2.2rem,6vw,4.4rem)]">
          {CATEGORY_LABEL[r.category]}, {r.locality}
        </h1>
        <span className={`chip status-${r.status} !text-base`}>{STATUS_LABEL[r.status]}</span>
      </div>
      <p className="text-muted">
        Ticket {r.ticket}, ward {r.ward}
        {r.assignedTo ? `, assigned to ${r.assignedTo}` : ""}
      </p>
      <p className="mt-3 max-w-[60ch] text-xl">{r.description}</p>

      {/* The repair as a stretch of road: yellow dashes get painted as it moves forward. */}
      <ol className="mt-8 grid grid-cols-4" aria-label="Repair progress">
        {LADDER.map((s, i) => (
          <li key={s} className="relative pt-6" aria-current={i === reached ? "step" : undefined}>
            <span aria-hidden="true" className={`absolute left-0 right-0 top-[7px] h-[5px] ${i < reached ? "dashes bg-ink" : i === reached ? "bg-gradient-to-r from-ink to-line" : "bg-line"} ${i === 3 ? "right-[calc(100%-16px)]" : ""}`} />
            <span aria-hidden="true" className={`absolute left-0 top-0 size-[19px] rounded-full border-[3px] border-ground ${i <= reached ? "bg-sign" : "bg-line"}`} />
            <span className={`block pr-2 text-[0.95rem] leading-tight ${i <= reached ? "font-bold" : "text-muted"}`}>{STATUS_LABEL[s]}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="display text-2xl">Updates</h2>
          <ul className="mt-3 border-t-2 border-ink">
            {[...r.events].reverse().map((e) => (
              <li key={e.at + e.status} className="border-b border-line py-2.5">
                <p className="font-semibold">{e.note}</p>
                <p className="text-[0.92rem] text-muted">{dateTime(e.at)}</p>
              </li>
            ))}
          </ul>
          {r.photoId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/uploads/${r.photoId}`} alt="Photo sent with this report" className="mt-5 w-full" />
          )}
        </div>
        <PinMap className="h-[360px]" zoom={14.5} center={{ lat: r.lat, lng: r.lng }} pins={[{ id: r.id, lat: r.lat, lng: r.lng, color: "#bf2f1a", label: "Problem location" }]} />
      </div>
    </div>
  );
}
