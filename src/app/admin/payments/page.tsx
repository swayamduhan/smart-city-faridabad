import type { Metadata } from "next";
import Link from "next/link";
import { rupees, serviceById } from "@/lib/bills";
import { getDb } from "@/lib/db";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

export default function AdminPayments() {
  const rows = getDb().payments.slice(0, 80);
  return (
    <>
      <h1 className="display text-[clamp(2.2rem,4.5vw,3.6rem)]">Payments</h1>
      <p className="text-muted">The latest 80 simulated transactions. No money has moved.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-2 pr-4 font-bold">
                Reference
              </th>
              <th scope="col" className="py-2 pr-4 font-bold">
                When
              </th>
              <th scope="col" className="py-2 pr-4 font-bold">
                Service
              </th>
              <th scope="col" className="py-2 pr-4 font-bold">
                Paid with
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-bold">
                Amount
              </th>
              <th scope="col" className="py-2 font-bold">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-line">
                <td className="py-2 pr-4">
                  <Link href={`/pay/receipt/${p.id}`} className="link">
                    {p.txnRef.slice(0, 14)}
                  </Link>
                </td>
                <td className="py-2 pr-4">{dateTime(p.createdAt)}</td>
                <td className="py-2 pr-4">{serviceById(p.service).label}</td>
                <td className="py-2 pr-4">{p.methodDetail}</td>
                <td className="py-2 pr-4 text-right font-semibold tabular-nums">{rupees(p.amount)}</td>
                <td className="py-2">{p.status === "success" ? <span className="chip status-resolved">Paid</span> : <span className="chip bg-alert text-white">Failed</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
