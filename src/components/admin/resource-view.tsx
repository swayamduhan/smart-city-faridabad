"use client";

import type { AdminResource } from "@/lib/actions";
import { STAGE_LABEL, crore, dateShort, salaryRange } from "@/lib/format";
import { type Field, ResourceManager } from "./resource-manager";

type Row = Record<string, unknown> & { id: string };

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

const CONFIG: Record<AdminResource, { noun: string; fields: Field[]; title: (r: Row) => string; detail: (r: Row) => string }> = {
  announcements: {
    noun: "notice",
    fields: [
      { name: "title", label: "Title", wide: true },
      { name: "body", label: "Message", type: "textarea", wide: true },
      { name: "kind", label: "Kind", type: "select", options: [{ value: "notice", label: "Notice" }, { value: "alert", label: "Alert" }, { value: "event", label: "Event" }] },
      { name: "ward", label: "Ward number", type: "number", optional: true },
    ],
    title: (r) => String(r.title),
    detail: (r) => `${String(r.kind)}, ${dateShort(String(r.publishedAt))}${r.ward ? `, ward ${r.ward}` : ", citywide"}`,
  },
  projects: {
    noun: "project",
    fields: [
      { name: "name", label: "Project name", wide: true },
      { name: "summary", label: "Summary", type: "textarea", wide: true },
      { name: "stage", label: "Stage", type: "select", options: Object.entries(STAGE_LABEL).map(([value, label]) => ({ value, label })) },
      { name: "progress", label: "Progress (%)", type: "number" },
      { name: "budgetCr", label: "Budget (₹ crore)", type: "number" },
      { name: "locality", label: "Area" },
      { name: "agency", label: "Run by" },
      { name: "category", label: "Category" },
    ],
    title: (r) => String(r.name),
    detail: (r) => `${STAGE_LABEL[r.stage as keyof typeof STAGE_LABEL]}, ${r.progress}%, ${crore(Number(r.budgetCr))}, ${r.locality}`,
  },
  jobs: {
    noun: "job",
    fields: [
      { name: "title", label: "Job title" },
      { name: "employer", label: "Employer" },
      { name: "category", label: "Field" },
      { name: "type", label: "Type", type: "select", options: opts(["Full-time", "Part-time", "Contract", "Apprenticeship"]) },
      { name: "locality", label: "Area" },
      { name: "experience", label: "Experience" },
      { name: "salaryMin", label: "Minimum pay a month (₹)", type: "number" },
      { name: "salaryMax", label: "Maximum pay a month (₹)", type: "number" },
      { name: "openings", label: "Openings", type: "number" },
      { name: "description", label: "Description", type: "textarea", wide: true },
    ],
    title: (r) => `${r.title}, ${r.employer}`,
    detail: (r) => `${r.category}, ${r.locality}, ${salaryRange(Number(r.salaryMin), Number(r.salaryMax))}`,
  },
  candidates: {
    noun: "candidate",
    fields: [
      { name: "name", label: "Full name" },
      { name: "ward", label: "Ward number", type: "number" },
      { name: "status", label: "Status", type: "select", options: [{ value: "standing", label: "Standing" }, { value: "elected", label: "Elected" }] },
      { name: "party", label: "Party" },
      { name: "age", label: "Age", type: "number" },
      { name: "education", label: "Education" },
      { name: "occupation", label: "Occupation" },
      { name: "assetsLakh", label: "Declared assets (₹ lakh)", type: "number" },
    ],
    title: (r) => String(r.name),
    detail: (r) => `Ward ${r.ward}, ${r.status}, ${r.party}`,
  },
};

export function AdminResourceView({ resource, rows }: { resource: AdminResource; rows: Row[] }) {
  const c = CONFIG[resource];
  return <ResourceManager resource={resource} noun={c.noun} rows={rows} fields={c.fields} title={c.title} detail={c.detail} />;
}
