import type { Metadata } from "next";
import { PageSign } from "@/components/page-sign";
import { ReportFlow } from "@/components/report-flow";
import { ReportList } from "@/components/report-list";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Report a problem" };

export default function ReportPage() {
  const reports = getDb().reports.map((r) => ({ id: r.id, ticket: r.ticket, category: r.category, description: r.description, locality: r.locality, ward: r.ward, status: r.status, createdAt: r.createdAt, photoId: r.photoId, lat: r.lat, lng: r.lng }));
  return (
    <>
      <PageSign title="Report a problem" hi="शिकायत करें">
        Potholes, garbage, broken streetlights, leaks. Take a photo, mark the spot, and track the fix.
      </PageSign>
      <div className="mx-auto max-w-[1200px] px-4 pt-8 lg:px-8">
        <ReportFlow />
        <ReportList reports={reports} />
      </div>
    </>
  );
}
