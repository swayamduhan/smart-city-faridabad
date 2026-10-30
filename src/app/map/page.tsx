import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map-explorer";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage() {
  const user = await currentUser();
  return (
    <Suspense>
      <MapExplorer signedIn={!!user} savedPlaces={user?.savedPlaces ?? []} />
    </Suspense>
  );
}
