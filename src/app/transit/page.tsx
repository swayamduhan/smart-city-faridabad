import type { Metadata } from "next";
import { PageSign } from "@/components/page-sign";
import { TransitLive } from "@/components/transit-live";

export const metadata: Metadata = { title: "Bus and metro" };

export default function TransitPage() {
  return (
    <>
      <PageSign title="Bus and metro" hi="बस और मेट्रो">
        See the next train, find a bus with seats, and watch vehicles move on the map.
      </PageSign>
      <div className="mx-auto max-w-[1400px] px-4 pt-8 lg:px-8">
        <TransitLive />
        <p className="mt-6 max-w-[75ch] text-[0.95rem] text-muted">
          Faridabad has no public real-time feed, so times, seats and vehicle positions are simulated. Metro stations and the line are real, from OpenStreetMap. Bus routes are invented but follow real roads.
        </p>
      </div>
    </>
  );
}
