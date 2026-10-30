import type { Metadata } from "next";
import { PageSign, SampleNote } from "@/components/page-sign";
import { PinMap } from "@/components/pin-map";
import { getDb } from "@/lib/db";
import { STAGE_LABEL, crore, dateShort } from "@/lib/format";
import type { ProjectStage } from "@/lib/types";

export const metadata: Metadata = { title: "New projects" };

const ORDER: ProjectStage[] = ["under_construction", "approved", "proposed", "completed"];
const HI: Record<ProjectStage, string> = { under_construction: "निर्माणाधीन", approved: "मंज़ूर", proposed: "प्रस्तावित", completed: "पूरे हुए" };

export default function ProjectsPage() {
  const { projects } = getDb();
  return (
    <>
      <PageSign title="New projects" hi="नई परियोजनाएं">
        Roads, drains, hospitals and parks: what&apos;s planned, what&apos;s being built, and how far along it is.
      </PageSign>
      <div className="mx-auto max-w-[1400px] px-4 pt-8 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            {ORDER.map((stage) => {
              const rows = projects.filter((p) => p.stage === stage);
              if (!rows.length) return null;
              return (
                <section key={stage} className="mb-12" aria-labelledby={stage}>
                  <div className="flex items-baseline gap-3">
                    <h2 id={stage} className="display text-3xl">
                      {STAGE_LABEL[stage]}
                    </h2>
                    <span className="hi text-muted">{HI[stage]}</span>
                  </div>
                  <ul className="mt-3 border-t-2 border-ink">
                    {rows.map((p) => (
                      <li key={p.id} id={p.id} className="scroll-mt-20 border-b border-line py-5 target:bg-mark/20">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-6">
                          <h3 className="text-[1.4rem] font-bold leading-snug">{p.name}</h3>
                          {p.progress > 0 && <span className="display text-2xl tabular-nums">{p.progress}%</span>}
                        </div>
                        <p className="mt-1 max-w-[65ch]">{p.summary}</p>
                        {p.progress > 0 && (
                          <div className="mt-3 h-2.5 bg-line" role="img" aria-label={`${p.progress}% complete`}>
                            <div className="h-full bg-sign" style={{ width: `${p.progress}%` }} />
                          </div>
                        )}
                        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[0.98rem] sm:grid-cols-4">
                          <div>
                            <dt className="text-muted">Budget</dt>
                            <dd className="font-semibold">{crore(p.budgetCr)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted">Where</dt>
                            <dd className="font-semibold">{p.locality}</dd>
                          </div>
                          <div>
                            <dt className="text-muted">{p.stage === "completed" ? "Finished" : "Expected"}</dt>
                            <dd className="font-semibold">{dateShort(p.endDate)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted">Run by</dt>
                            <dd className="font-semibold">{p.agency}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <PinMap className="h-[420px] lg:h-[calc(100svh-8rem)]" pins={projects.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, color: p.stage === "completed" ? "#6c7a73" : p.stage === "under_construction" ? "#00603f" : "#e5a800", label: p.name, href: `#${p.id}` }))} />
            <SampleNote>Sample data for this demo. These projects and figures are illustrative, not official plans.</SampleNote>
          </aside>
        </div>
      </div>
    </>
  );
}
