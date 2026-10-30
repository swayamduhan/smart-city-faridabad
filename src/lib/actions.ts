"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser, endSession, hashPassword, requireAdmin, requireUser, startSession, verifyPassword } from "./auth";
import { SERVICES, billKey, quoteBill, serviceById } from "./bills";
import { UPLOAD_DIR, getDb, mutate, newId } from "./db";
import { distanceKm } from "./format";
import type { Announcement, Bill, Candidate, IssueCategory, IssueStatus, Job, PayMethod, Payment, Project, ServiceId } from "./types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const safeNext = (next: unknown) => (typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/account");

/* ---------- Accounts ---------- */

export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = getDb().users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) return "That email and password don't match. Check them and try again.";
  await startSession(user.id);
  redirect(user.role === "admin" && !form.get("next") ? "/admin" : safeNext(form.get("next")));
}

export async function demoSignIn(role: "citizen" | "admin", next?: string) {
  const user = getDb().users.find((u) => u.id === `demo-${role}`);
  if (!user) throw new Error("Demo account missing");
  await startSession(user.id);
  redirect(role === "admin" ? "/admin" : safeNext(next));
}

const SignUp = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.email("Enter a valid email address.").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters for your password."),
  ward: z.coerce.number().int().min(1).max(46),
});

export async function signUp(_: string | null, form: FormData): Promise<string | null> {
  const parsed = SignUp.safeParse(Object.fromEntries(form));
  if (!parsed.success) return parsed.error.issues[0].message;
  const { name, email, password, ward } = parsed.data;
  if (getDb().users.some((u) => u.email === email)) return "An account with this email already exists. Sign in instead.";
  const id = newId();
  mutate((db) => {
    db.users.push({ id, name, email, ward, role: "citizen", passwordHash: hashPassword(password), createdAt: new Date().toISOString(), savedPlaces: [], savedJobs: [], connections: [] });
  });
  await startSession(id);
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  await endSession();
  redirect("/");
}

export async function updateProfile(_: string | null, form: FormData): Promise<string | null> {
  const user = await requireUser();
  const parsed = z.object({ name: z.string().trim().min(2, "Enter your full name."), phone: z.string().trim().max(16), ward: z.coerce.number().int().min(1).max(46) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return parsed.error.issues[0].message;
  mutate((db) => Object.assign(db.users.find((u) => u.id === user.id)!, parsed.data));
  revalidatePath("/account");
  return "Profile saved.";
}

/* ---------- Bills (simulated) ---------- */

export async function fetchBill(service: ServiceId, consumerNo: string): Promise<ActionResult<Bill>> {
  if (!SERVICES.some((s) => s.id === service)) return { ok: false, error: "Choose a service from the list." };
  const clean = String(consumerNo).trim();
  if (clean.length < 6) return { ok: false, error: `Enter the full ${serviceById(service).numberLabel.toLowerCase()}. It has at least 6 characters.` };
  const paid = new Set(getDb().payments.filter((p) => p.status === "success").map((p) => billKey(p.service, p.consumerNo, p.periodKey)));
  return { ok: true, data: quoteBill(service, clean, new Date(), (k) => paid.has(k)) };
}

const PayInput = z.object({ service: z.string(), consumerNo: z.string(), method: z.enum(["upi", "card", "netbanking"]), detail: z.string().trim(), save: z.boolean().optional() });

/** No payment gateway is involved. A few test inputs fail on purpose so the error flow can be shown. */
export async function payBill(input: z.input<typeof PayInput>): Promise<ActionResult<{ paymentId: string }>> {
  const parsed = PayInput.parse(input);
  const service = parsed.service as ServiceId;
  const user = await currentUser();
  const bill = await fetchBill(service, parsed.consumerNo);
  if (!bill.ok) return bill;
  if (bill.data.paid) return { ok: false, error: "This bill is already paid." };

  const method = parsed.method as PayMethod;
  const detail = parsed.detail;
  if (method === "upi" && !/^[\w.-]+@[\w.-]+$/.test(detail)) return { ok: false, error: "Enter a UPI ID in the form name@bank." };
  if (method === "card" && detail.replace(/\D/g, "").length !== 16) return { ok: false, error: "Enter the 16-digit card number." };
  if (method === "netbanking" && !detail) return { ok: false, error: "Choose your bank." };

  const declined = (method === "upi" && detail.toLowerCase().startsWith("fail@")) || (method === "card" && detail.replace(/\D/g, "").endsWith("0000"));
  const createdAt = new Date();
  const payment: Payment = {
    id: newId(),
    txnRef: `SIM${createdAt.getTime().toString(36).toUpperCase()}`,
    userId: user?.id ?? null,
    service,
    consumerNo: bill.data.consumerNo,
    holder: bill.data.holder,
    period: bill.data.period,
    periodKey: bill.data.periodKey,
    amount: bill.data.amount,
    method,
    methodDetail: method === "upi" ? detail : method === "card" ? `Card ending ${detail.replace(/\D/g, "").slice(-4)}` : detail,
    status: declined ? "failed" : "success",
    createdAt: createdAt.toISOString(),
  };
  mutate((db) => {
    db.payments.unshift(payment);
    if (parsed.save && user && !declined) {
      const me = db.users.find((u) => u.id === user.id)!;
      if (!me.connections.some((c) => c.service === service && c.consumerNo === payment.consumerNo)) me.connections.push({ service, consumerNo: payment.consumerNo, label: "Home" });
    }
  });
  revalidatePath("/account");
  revalidatePath("/admin");
  if (declined) return { ok: false, error: "Your bank declined this payment. Nothing was charged. Try another method." };
  return { ok: true, data: { paymentId: payment.id } };
}

export async function removeConnection(service: ServiceId, consumerNo: string) {
  const user = await requireUser();
  mutate((db) => {
    const me = db.users.find((u) => u.id === user.id)!;
    me.connections = me.connections.filter((c) => !(c.service === service && c.consumerNo === consumerNo));
  });
  revalidatePath("/account");
}

/* ---------- Reports ---------- */

const REPORT_CATEGORIES = ["roads", "garbage", "streetlight", "water", "drain", "other"] as const;

export async function submitReport(form: FormData): Promise<ActionResult<{ id: string; ticket: string }>> {
  const parsed = z
    .object({
      category: z.enum(REPORT_CATEGORIES),
      description: z.string().trim().min(8, "Describe the problem in a few more words.").max(600),
      lat: z.coerce.number().min(28.2).max(28.65, "That location is outside Faridabad. Move the pin into the city."),
      lng: z.coerce.number().min(77.1).max(77.55, "That location is outside Faridabad. Move the pin into the city."),
    })
    .safeParse({ category: form.get("category"), description: form.get("description"), lat: form.get("lat"), lng: form.get("lng") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const photo = form.get("photo");
  let photoId: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 8 * 1024 * 1024) return { ok: false, error: "That photo is over 8 MB. Choose a smaller one." };
    if (!photo.type.startsWith("image/")) return { ok: false, error: "That file isn't an image. Choose a photo." };
    photoId = newId();
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, `${photoId}.jpg`), Buffer.from(await photo.arrayBuffer()));
  }

  const user = await currentUser();
  const { category, description, lat, lng } = parsed.data;
  const db = getDb();
  const nearest = db.wards.reduce((best, w) => (distanceKm(w, { lat, lng }) < distanceKm(best, { lat, lng }) ? w : best));
  const id = newId();
  const ticket = `FBD-${10234 + db.reports.length * 7}`;
  const now = new Date().toISOString();
  mutate((d) => {
    d.reports.unshift({
      id,
      ticket,
      userId: user?.id ?? null,
      category: category as IssueCategory,
      description,
      lat,
      lng,
      locality: nearest.localities[0],
      ward: nearest.number,
      photoId,
      status: "submitted",
      createdAt: now,
      events: [{ status: "submitted", at: now, note: "Report received." }],
    });
  });
  revalidatePath("/report");
  revalidatePath("/admin");
  return { ok: true, data: { id, ticket } };
}

/* ---------- Saved items and job applications ---------- */

export async function toggleSavedPlace(placeId: string): Promise<ActionResult<{ saved: boolean }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to save places." };
  const saved = mutate((db) => {
    const me = db.users.find((u) => u.id === user.id)!;
    const has = me.savedPlaces.includes(placeId);
    me.savedPlaces = has ? me.savedPlaces.filter((p) => p !== placeId) : [...me.savedPlaces, placeId];
    return !has;
  });
  revalidatePath("/account");
  return { ok: true, data: { saved } };
}

export async function toggleSavedJob(jobId: string): Promise<ActionResult<{ saved: boolean }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to save jobs." };
  const saved = mutate((db) => {
    const me = db.users.find((u) => u.id === user.id)!;
    const has = me.savedJobs.includes(jobId);
    me.savedJobs = has ? me.savedJobs.filter((p) => p !== jobId) : [...me.savedJobs, jobId];
    return !has;
  });
  revalidatePath("/account");
  return { ok: true, data: { saved } };
}

export async function applyToJob(jobId: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to apply." };
  if (!getDb().jobs.some((j) => j.id === jobId)) return { ok: false, error: "This job is no longer open." };
  mutate((db) => {
    if (!db.applications.some((a) => a.jobId === jobId && a.userId === user.id)) {
      db.applications.unshift({ id: newId(), jobId, userId: user.id, status: "applied", createdAt: new Date().toISOString() });
    }
  });
  revalidatePath("/account");
  revalidatePath("/jobs");
  return { ok: true, data: undefined };
}

/* ---------- Admin ---------- */

export async function updateReport(id: string, status: IssueStatus, assignedTo: string, note: string): Promise<void> {
  await requireAdmin();
  z.enum(["submitted", "acknowledged", "in_progress", "resolved"]).parse(status);
  mutate((db) => {
    const report = db.reports.find((r) => r.id === id);
    if (!report) return;
    const changed = report.status !== status;
    report.status = status;
    report.assignedTo = assignedTo || undefined;
    if (changed || note) report.events.push({ status, at: new Date().toISOString(), note: note || `Moved to ${status.replace("_", " ")}.` });
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/report", "layout");
  revalidatePath("/account");
}

const num = z.coerce.number();

const SCHEMAS = {
  announcements: z.object({ title: z.string().trim().min(4), body: z.string().trim().min(4), kind: z.enum(["notice", "alert", "event"]), ward: z.preprocess((v) => (v === "" || v == null ? undefined : v), num.int().min(1).max(46).optional()) }),
  projects: z.object({ name: z.string().trim().min(3), summary: z.string().trim().min(4), stage: z.enum(["proposed", "approved", "under_construction", "completed"]), progress: num.min(0).max(100), budgetCr: num.min(0), locality: z.string().trim().min(2), agency: z.string().trim().min(2), category: z.string().trim().min(2) }),
  jobs: z.object({ title: z.string().trim().min(2), employer: z.string().trim().min(2), category: z.string().trim().min(2), type: z.enum(["Full-time", "Part-time", "Contract", "Apprenticeship"]), locality: z.string().trim().min(2), salaryMin: num.min(0), salaryMax: num.min(0), experience: z.string().trim().min(1), openings: num.int().min(1), description: z.string().trim().min(4) }),
  candidates: z.object({ name: z.string().trim().min(2), ward: num.int().min(1).max(46), age: num.int().min(21).max(100), party: z.string().trim().min(2), status: z.enum(["elected", "standing"]), education: z.string().trim().min(2), occupation: z.string().trim().min(2), assetsLakh: num.min(0) }),
} as const;

export type AdminResource = keyof typeof SCHEMAS;

export async function adminSave(resource: AdminResource, id: string | null, values: Record<string, unknown>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = SCHEMAS[resource].safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Check the ${String(issue.path[0] ?? "form")} field: ${issue.message}` };
  }
  const now = new Date().toISOString();
  mutate((db) => {
    if (resource === "announcements") {
      const v = parsed.data as Pick<Announcement, "title" | "body" | "kind" | "ward">;
      const row = id && db.announcements.find((a) => a.id === id);
      if (row) Object.assign(row, v);
      else db.announcements.unshift({ ...v, id: newId(), publishedAt: now });
    }
    if (resource === "projects") {
      const v = parsed.data as Partial<Project>;
      const row = id && db.projects.find((p) => p.id === id);
      if (row) Object.assign(row, v);
      else db.projects.unshift({ lat: 28.41, lng: 77.31, startDate: now, endDate: new Date(Date.now() + 365 * 86_400_000).toISOString(), ...(v as Omit<Project, "id" | "lat" | "lng" | "startDate" | "endDate">), id: newId() });
    }
    if (resource === "jobs") {
      const v = parsed.data as Partial<Job>;
      const row = id && db.jobs.find((j) => j.id === id);
      if (row) Object.assign(row, v);
      else db.jobs.unshift({ ...(v as Omit<Job, "id" | "postedAt">), id: newId(), postedAt: now });
    }
    if (resource === "candidates") {
      const v = parsed.data as Partial<Candidate>;
      const row = id && db.candidates.find((c) => c.id === id);
      if (row) Object.assign(row, v);
      else db.candidates.push({ promises: [], ...(v as Omit<Candidate, "id" | "promises">), id: newId() });
    }
  });
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function adminDelete(resource: AdminResource, id: string): Promise<void> {
  await requireAdmin();
  mutate((db) => {
    const list = db[resource] as { id: string }[];
    const at = list.findIndex((x) => x.id === id);
    if (at >= 0) list.splice(at, 1);
  });
  revalidatePath("/", "layout");
}
