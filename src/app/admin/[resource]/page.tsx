import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminResourceView } from "@/components/admin/resource-view";
import type { AdminResource } from "@/lib/actions";
import { getDb } from "@/lib/db";

const TITLES: Record<AdminResource, string> = { announcements: "Notices", projects: "Projects", jobs: "Jobs", candidates: "Candidates" };

export async function generateMetadata({ params }: PageProps<"/admin/[resource]">): Promise<Metadata> {
  const { resource } = await params;
  return { title: TITLES[resource as AdminResource] ?? "Admin" };
}

export default async function AdminResourcePage({ params }: PageProps<"/admin/[resource]">) {
  const { resource } = await params;
  if (!(resource in TITLES)) notFound();
  const res = resource as AdminResource;
  const rows = getDb()[res] as unknown as (Record<string, unknown> & { id: string })[];
  return (
    <>
      <h1 className="display text-[clamp(2.2rem,4.5vw,3.6rem)]">{TITLES[res]}</h1>
      <AdminResourceView resource={res} rows={rows} />
    </>
  );
}
