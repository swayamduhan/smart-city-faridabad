import type { Metadata } from "next";
import Link from "next/link";
import { PageSign } from "@/components/page-sign";
import { ProfileForm } from "@/components/profile-form";
import { RemoveConnection } from "@/components/remove-connection";
import places from "@/data/places.json";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/lib/actions";
import { billKey, quoteBill, rupees, serviceById } from "@/lib/bills";
import { getDb } from "@/lib/db";
import { CATEGORY_LABEL, STATUS_LABEL, dateShort, timeAgo } from "@/lib/format";
import type { Place } from "@/lib/types";

export const metadata: Metadata = { title: "Your account" };

const APP_STATUS = { applied: "Applied", shortlisted: "Shortlisted", rejected: "Not selected" } as const;

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { denied } = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const paid = new Set(db.payments.filter((p) => p.status === "success").map((p) => billKey(p.service, p.consumerNo, p.periodKey)));
  const bills = user.connections.map((c) => ({ c, bill: quoteBill(c.service, c.consumerNo, new Date(), (k) => paid.has(k)) }));
  const due = bills.filter((b) => !b.bill.paid);
  const payments = db.payments.filter((p) => p.userId === user.id).slice(0, 8);
  const reports = db.reports.filter((r) => r.userId === user.id);
  const applications = db.applications.filter((a) => a.userId === user.id);
  const savedJobs = db.jobs.filter((j) => user.savedJobs.includes(j.id));
  const savedPlaces = (places as Place[]).filter((p) => user.savedPlaces.includes(p.id));
  const ward = db.wards.find((w) => w.number === user.ward);

  return (
    <>
      <PageSign
        title={user.name}
        hi="आपका खाता"
        aside={
          <form action={signOut}>
            <button className="btn btn-line">Sign out</button>
          </form>
        }
      >
        {ward ? (
          <>
            Ward {ward.number}, {ward.name}.{" "}
            <Link href={`/wards/${ward.number}`} className="link">
              See your ward
            </Link>
          </>
        ) : null}
      </PageSign>
      <div className="mx-auto max-w-[1200px] px-4 pt-8 lg:px-8">
        {denied === "admin" && (
          <p role="alert" className="mb-6 border-l-4 border-alert pl-3 font-semibold text-alert">
            The admin dashboard needs an admin account. Sign out and use the demo admin to see it.
          </p>
        )}

        <div className="grid gap-x-14 gap-y-12 lg:grid-cols-2">
          <section aria-labelledby="bills">
            <h2 id="bills" className="display text-3xl">
              {due.length ? `${due.length} ${due.length === 1 ? "bill" : "bills"} to pay` : "Your bills"}
            </h2>
            <ul className="mt-3 border-t-2 border-ink">
              {bills.map(({ c, bill }) => (
                <li key={c.service + c.consumerNo} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
                  <div>
                    <p className="font-bold">{serviceById(c.service).label}</p>
                    <p className="text-[0.95rem] text-muted">
                      {c.consumerNo}. {bill.paid ? "Paid for this period." : `Pay by ${dateShort(bill.dueDate)}.`}
                    </p>
                    <RemoveConnection service={c.service} consumerNo={c.consumerNo} />
                  </div>
                  {bill.paid ? (
                    <span className="chip status-resolved">Paid</span>
                  ) : (
                    <Link href={`/pay?service=${c.service}&no=${c.consumerNo}`} className="btn btn-mark">
                      Pay {rupees(bill.amount)}
                    </Link>
                  )}
                </li>
              ))}
              {bills.length === 0 && (
                <li className="py-4 text-muted">
                  No saved connections yet. <Link href="/pay" className="link font-semibold">Pay a bill</Link> and save it here.
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="my-reports">
            <h2 id="my-reports" className="display text-3xl">
              Your reports
            </h2>
            <ul className="mt-3 border-t-2 border-ink">
              {reports.map((r) => (
                <li key={r.id} className="border-b border-line">
                  <Link href={`/report/${r.id}`} className="row-link flex items-start justify-between gap-3 px-1 py-3">
                    <span>
                      <span className="block font-bold">
                        {CATEGORY_LABEL[r.category]}, {r.locality}
                      </span>
                      <span className="block text-[0.95rem] text-muted">
                        {r.ticket}, {timeAgo(r.createdAt)}
                      </span>
                    </span>
                    <span className={`chip status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  </Link>
                </li>
              ))}
              {reports.length === 0 && (
                <li className="py-4 text-muted">
                  Nothing reported yet. <Link href="/report" className="link font-semibold">Report a problem</Link>
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="applications">
            <h2 id="applications" className="display text-3xl">
              Job applications
            </h2>
            <ul className="mt-3 border-t-2 border-ink">
              {applications.map((a) => {
                const job = db.jobs.find((j) => j.id === a.jobId);
                if (!job) return null;
                return (
                  <li key={a.id} className="flex items-start justify-between gap-3 border-b border-line py-3">
                    <span>
                      <span className="block font-bold">{job.title}</span>
                      <span className="block text-[0.95rem] text-muted">
                        {job.employer}, applied {timeAgo(a.createdAt)}
                      </span>
                    </span>
                    <span className={`chip ${a.status === "shortlisted" ? "status-in_progress" : a.status === "rejected" ? "status-submitted" : "status-acknowledged"}`}>{APP_STATUS[a.status]}</span>
                  </li>
                );
              })}
              {applications.length === 0 && (
                <li className="py-4 text-muted">
                  No applications yet. <Link href="/jobs" className="link font-semibold">Browse jobs</Link>
                </li>
              )}
            </ul>
            {savedJobs.length > 0 && (
              <>
                <h3 className="mt-5 font-bold">Saved jobs</h3>
                <ul className="mt-1">
                  {savedJobs.map((j) => (
                    <li key={j.id}>
                      <Link href={`/jobs?job=${j.id}`} className="link">
                        {j.title}, {j.employer}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="history">
            <h2 id="history" className="display text-3xl">
              Payment history
            </h2>
            <ul className="mt-3 border-t-2 border-ink">
              {payments.map((p) => (
                <li key={p.id} className="border-b border-line">
                  <Link href={`/pay/receipt/${p.id}`} className="row-link flex items-baseline justify-between gap-3 px-1 py-2.5">
                    <span>
                      <span className="block font-semibold">{serviceById(p.service).label}</span>
                      <span className="block text-[0.95rem] text-muted">{dateShort(p.createdAt)}</span>
                    </span>
                    <span className="text-right font-bold tabular-nums">
                      {rupees(p.amount)}
                      {p.status === "failed" && <span className="block text-[0.9rem] font-semibold text-alert">Failed</span>}
                    </span>
                  </Link>
                </li>
              ))}
              {payments.length === 0 && <li className="py-4 text-muted">Your paid bills will show up here.</li>}
            </ul>
          </section>

          <section aria-labelledby="saved-places">
            <h2 id="saved-places" className="display text-3xl">
              Saved places
            </h2>
            <ul className="mt-3 border-t-2 border-ink">
              {savedPlaces.map((p) => (
                <li key={p.id} className="border-b border-line">
                  <Link href={`/map?place=${p.id}`} className="row-link block px-1 py-2.5 font-semibold">
                    {p.name}
                  </Link>
                </li>
              ))}
              {savedPlaces.length === 0 && (
                <li className="py-4 text-muted">
                  Nothing saved yet. <Link href="/places" className="link font-semibold">Browse places</Link>
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="profile">
            <h2 id="profile" className="display text-3xl">
              Your details
            </h2>
            <ProfileForm name={user.name} phone={user.phone ?? ""} email={user.email} ward={user.ward} wards={db.wards.map((w) => ({ number: w.number, name: w.name }))} />
          </section>
        </div>
      </div>
    </>
  );
}
