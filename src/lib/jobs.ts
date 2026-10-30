import "server-only";
import { getDb } from "./db";
import type { Job } from "./types";

// Adzuna has real Indian listings but needs a free key. Without one, the sample jobs still show.
export async function listJobs(): Promise<{ jobs: Job[]; live: boolean }> {
  const local = getDb().jobs;
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return { jobs: local, live: false };
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${id}&app_key=${key}&where=Faridabad&results_per_page=30&content-type=application/json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const live: Job[] = (data.results ?? []).map((r: Record<string, never>) => {
      const company = r.company as { display_name?: string } | undefined;
      const location = r.location as { display_name?: string } | undefined;
      const category = r.category as { label?: string } | undefined;
      return {
        id: `adzuna-${r.id}`,
        title: String(r.title).replace(/<[^>]+>/g, ""),
        employer: company?.display_name ?? "Employer not listed",
        category: category?.label?.replace(" Jobs", "") ?? "Other",
        type: "Full-time",
        locality: location?.display_name ?? "Faridabad",
        salaryMin: Math.round(Number(r.salary_min ?? 0) / 12),
        salaryMax: Math.round(Number(r.salary_max ?? 0) / 12),
        experience: "See listing",
        openings: 1,
        description: String(r.description).replace(/<[^>]+>/g, ""),
        postedAt: String(r.created),
        externalUrl: String(r.redirect_url),
      } satisfies Job;
    });
    return { jobs: [...live, ...local], live: live.length > 0 };
  } catch {
    return { jobs: local, live: false };
  }
}
