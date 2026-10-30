import type { Metadata } from "next";
import { Suspense } from "react";
import { JobBoard } from "@/components/job-board";
import { PageSign, SampleNote } from "@/components/page-sign";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listJobs } from "@/lib/jobs";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage() {
  const [{ jobs, live }, user] = await Promise.all([listJobs(), currentUser()]);
  const applied = user ? getDb().applications.filter((a) => a.userId === user.id).map((a) => a.jobId) : [];
  return (
    <>
      <PageSign title="Jobs" hi="नौकरियां">
        {jobs.length} openings in Faridabad, from factory floors to hospitals, schools and offices.
      </PageSign>
      <div className="mx-auto max-w-[1100px] px-4 pt-8 lg:px-8">
        <Suspense>
          <JobBoard jobs={jobs} signedIn={!!user} savedJobs={user?.savedJobs ?? []} applied={applied} />
        </Suspense>
        <SampleNote>{live ? "Includes live listings from Adzuna, plus sample jobs for this demo." : "Sample jobs for this demo. Employers and listings are invented."}</SampleNote>
      </div>
    </>
  );
}
