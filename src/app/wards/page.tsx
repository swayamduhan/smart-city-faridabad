import type { Metadata } from "next";
import { PageSign, SampleNote } from "@/components/page-sign";
import { WardFinder } from "@/components/ward-finder";
import { getDb } from "@/lib/db";
import { dateShort } from "@/lib/format";

export const metadata: Metadata = { title: "Ward candidates" };

export default function WardsPage() {
  const db = getDb();
  const rows = db.wards.map((w) => {
    const elected = db.candidates.find((c) => c.ward === w.number && c.status === "elected");
    return {
      number: w.number,
      name: w.name,
      lat: w.lat,
      lng: w.lng,
      councillor: elected?.name ?? "Vacant",
      party: elected?.party ?? "",
      standing: db.candidates.filter((c) => c.ward === w.number && c.status === "standing").length,
    };
  });
  return (
    <>
      <PageSign title="Ward candidates" hi="वार्ड प्रत्याशी">
        See who represents your ward and who is standing in the next election on {dateShort(db.wards[0].electionDate)}.
      </PageSign>
      <div className="mx-auto max-w-[1200px] px-4 pt-8 lg:px-8">
        <WardFinder wards={rows} />
        <SampleNote>Faridabad has 46 wards, but all names, parties, dates and ward areas here are invented for this demo. None of these are real people.</SampleNote>
      </div>
    </>
  );
}
