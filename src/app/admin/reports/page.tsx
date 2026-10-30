import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsDesk } from "@/components/admin/reports-desk";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Citizen reports" };

export default function AdminReports() {
  const { reports } = getDb();
  return (
    <>
      <h1 className="display text-[clamp(2.2rem,4.5vw,3.6rem)]">Citizen reports</h1>
      <Suspense>
        <ReportsDesk reports={reports} />
      </Suspense>
    </>
  );
}
