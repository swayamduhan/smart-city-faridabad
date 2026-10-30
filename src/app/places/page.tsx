import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSign, SampleNote } from "@/components/page-sign";
import { PlacesDirectory } from "@/components/places-directory";
import places from "@/data/places.json";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Places" };

export default async function PlacesPage() {
  const user = await currentUser();
  return (
    <>
      <PageSign title="Places" hi="जगहें">
        {places.length} schools, hospitals, parks, cafes and food spots in and around Faridabad.
      </PageSign>
      <div className="mx-auto max-w-[1200px] px-4 pt-8 lg:px-8">
        <Suspense>
          <PlacesDirectory signedIn={!!user} savedPlaces={user?.savedPlaces ?? []} />
        </Suspense>
        <SampleNote>Real places, from OpenStreetMap contributors. Details can be out of date, and smaller places may be missing.</SampleNote>
      </div>
    </>
  );
}
