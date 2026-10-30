import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { rupees, serviceById } from "@/lib/bills";
import { getDb } from "@/lib/db";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: PageProps<"/pay/receipt/[id]">) {
  const { id } = await params;
  const p = getDb().payments.find((x) => x.id === id);
  if (!p) notFound();
  const def = serviceById(p.service);
  const rows = [
    ["Reference", p.txnRef],
    ["Paid on", dateTime(p.createdAt)],
    ["Service", def.label],
    [def.numberLabel, p.consumerNo],
    ["Account holder", p.holder],
    ["Billing period", p.period],
    ["Paid with", p.methodDetail],
  ];
  return (
    <div className="mx-auto max-w-xl px-4 pt-10">
      <div className="plate on-sign px-7 py-6">
        <p className="hi">भुगतान रसीद</p>
        <h1 className="display text-4xl">Payment receipt</h1>
        <p className="display mt-4 text-6xl tabular-nums">{rupees(p.amount)}</p>
        <p className="mt-1 font-semibold text-mark">{p.status === "success" ? "Paid" : "Failed. Nothing was charged."}</p>
      </div>
      <dl className="mt-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[0.95rem] text-muted">Simulated receipt from a college demo. It isn&apos;t proof of a real payment.</p>
      <div className="no-print mt-5 flex flex-wrap gap-2">
        <PrintButton />
        <Link href="/pay" className="btn btn-line">
          Pay another bill
        </Link>
      </div>
    </div>
  );
}
