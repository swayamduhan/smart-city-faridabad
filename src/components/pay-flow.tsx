"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fetchBill, payBill } from "@/lib/actions";
import { SERVICES, rupees, serviceById } from "@/lib/bills";
import { dateShort } from "@/lib/format";
import type { Bill, Connection, PayMethod, ServiceId } from "@/lib/types";

const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Punjab National Bank", "Axis Bank", "Bank of Baroda"];
const STAGES = ["Contacting your bank", "Confirming the payment", "Updating your bill"];

export function PayFlow({ initialService, initialNo, connections, signedIn }: { initialService?: string; initialNo?: string; connections: Connection[]; signedIn: boolean }) {
  const [service, setService] = useState<ServiceId>(SERVICES.some((s) => s.id === initialService) ? (initialService as ServiceId) : "electricity");
  const [number, setNumber] = useState(initialNo ?? "");
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const def = serviceById(service);

  const lookup = (svc: ServiceId, no: string) => {
    setError(null);
    start(async () => {
      const res = await fetchBill(svc, no);
      if (res.ok) setBill(res.data);
      else {
        setBill(null);
        setError(res.error);
      }
    });
  };

  const ran = useRef(false);
  useEffect(() => {
    if (initialNo && !ran.current) {
      ran.current = true;
      lookup(service, initialNo);
    }
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr]">
      <div>
        <h2 className="display text-2xl">What are you paying?</h2>
        <ul className="mt-3 grid grid-cols-1 border-t-2 border-ink sm:grid-cols-2 sm:gap-x-6">
          {SERVICES.map((s) => (
            <li key={s.id} className="border-b border-line">
              <button
                type="button"
                aria-pressed={s.id === service}
                onClick={() => {
                  setService(s.id);
                  setBill(null);
                  setError(null);
                  setNumber("");
                }}
                className={`flex w-full items-baseline justify-between gap-3 px-2 py-2.5 text-left font-semibold transition-colors ${s.id === service ? "bg-sign text-white" : "hover:bg-sign/10"}`}
              >
                {s.label}
                <span className="hi text-[0.92rem] font-normal opacity-85">{s.labelHi}</span>
              </button>
            </li>
          ))}
        </ul>

        {connections.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold">Your saved connections</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {connections.map((c) => (
                <li key={c.service + c.consumerNo}>
                  <button
                    type="button"
                    className="filter"
                    onClick={() => {
                      setService(c.service);
                      setNumber(c.consumerNo);
                      lookup(c.service, c.consumerNo);
                    }}
                  >
                    {serviceById(c.service).label}, {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(service, number);
          }}
        >
          <label className="label" htmlFor="consumer">
            {def.numberLabel}
          </label>
          <div className="flex gap-2">
            <input id="consumer" value={number} onChange={(e) => setNumber(e.target.value)} className="field" inputMode={/^\d+$/.test(def.sample) ? "numeric" : "text"} placeholder={`For example ${def.sample}`} aria-invalid={!!error} aria-describedby={error ? "consumer-error" : undefined} />
            <button className="btn btn-mark shrink-0" disabled={pending}>
              {pending ? "Fetching" : "Fetch bill"}
            </button>
          </div>
          {error && (
            <p id="consumer-error" role="alert" className="mt-2 font-semibold text-alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn btn-ghost mt-1 !px-0 text-[0.95rem] !font-semibold"
            onClick={() => {
              setNumber(def.sample);
              lookup(service, def.sample);
            }}
          >
            Use a sample number
          </button>
        </form>
      </div>

      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {bill ? (
            <motion.div key={bill.service + bill.consumerNo} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <BillPanel bill={bill} signedIn={signedIn} onPaidElsewhere={() => lookup(bill.service, bill.consumerNo)} />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-full place-items-center border-2 border-dashed border-line p-8 text-center text-muted">
              <p className="max-w-[34ch]">Your bill will show up here. Enter your number, or use a sample number to try it.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BillPanel({ bill, signedIn, onPaidElsewhere }: { bill: Bill; signedIn: boolean; onPaidElsewhere: () => void }) {
  const [checkout, setCheckout] = useState(false);
  const def = serviceById(bill.service);
  const rows = [
    ["Account holder", bill.holder],
    [def.numberLabel, bill.consumerNo],
    ["Billing period", bill.period],
    ["Usage", bill.usage],
    ["Pay by", dateShort(bill.dueDate)],
  ];

  return (
    <div className="bg-plate p-6 shadow-[inset_0_0_0_2px_var(--color-line)]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="display text-2xl">{def.label} bill</h2>
        {bill.paid && <span className="chip status-resolved">Paid</span>}
      </div>
      <dl className="mt-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line py-1.5">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">{bill.paid ? "Amount paid" : "Amount due"}</p>
          <p className="display text-[clamp(2.4rem,5vw,3.6rem)] tabular-nums">{rupees(bill.amount)}</p>
        </div>
        {!bill.paid && !checkout && (
          <button type="button" className="btn btn-mark" onClick={() => setCheckout(true)}>
            Pay {rupees(bill.amount)}
          </button>
        )}
      </div>
      {checkout && <Checkout bill={bill} signedIn={signedIn} onDone={onPaidElsewhere} />}
    </div>
  );
}

function Checkout({ bill, signedIn, onDone }: { bill: Bill; signedIn: boolean; onDone: () => void }) {
  const [method, setMethod] = useState<PayMethod>("upi");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [bank, setBank] = useState(BANKS[0]);
  const [save, setSave] = useState(true);
  const [stage, setStage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (method === "card" && (!/^\d{2}\/\d{2}$/.test(expiry) || cvv.length !== 3)) {
      setError("Enter the expiry as MM/YY and the 3-digit CVV.");
      return;
    }
    const detail = method === "upi" ? upi : method === "card" ? card : bank;
    setStage(0);
    const timers = [setTimeout(() => setStage(1), 800), setTimeout(() => setStage(2), 1600)];
    const [res] = await Promise.all([payBill({ service: bill.service, consumerNo: bill.consumerNo, method, detail, save }), new Promise((r) => setTimeout(r, 2300))]);
    timers.forEach(clearTimeout);
    setStage(null);
    if (res.ok) setReceipt(res.data.paymentId);
    else setError(res.error);
  };

  if (receipt) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 bg-sign p-5 text-white on-sign" role="status">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 32 32" className="size-9 shrink-0" fill="none" stroke="var(--color-mark)" strokeWidth="4" aria-hidden="true">
            <motion.path d="M5 17l7 7L27 8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: "easeOut" }} />
          </svg>
          <p className="display text-2xl">Payment complete</p>
        </div>
        <p className="mt-2">{rupees(bill.amount)} paid. No real money moved, because this is a simulation.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/pay/receipt/${receipt}`} className="btn btn-mark">
            View receipt
          </Link>
          <button type="button" className="btn btn-line" onClick={onDone}>
            Done
          </button>
        </div>
      </motion.div>
    );
  }

  if (stage !== null) {
    return (
      <div className="board mt-5 px-5 py-4" role="status" aria-live="polite">
        {STAGES.map((s, i) => (
          <p key={s} className={`led text-xl transition-opacity sm:text-2xl ${i > stage ? "opacity-20" : ""}`}>
            {i < stage ? "Done: " : i === stage ? "Now: " : ""}
            {s}
          </p>
        ))}
      </div>
    );
  }

  return (
    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={pay} className="mt-5 overflow-hidden border-t-2 border-ink pt-4">
      <p className="font-semibold">Pay with</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Payment method">
        {(
          [
            ["upi", "UPI"],
            ["card", "Card"],
            ["netbanking", "Net banking"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className="filter" aria-pressed={method === id} onClick={() => setMethod(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {method === "upi" && (
          <div>
            <label className="label" htmlFor="upi">
              UPI ID
            </label>
            <input id="upi" value={upi} onChange={(e) => setUpi(e.target.value)} required placeholder="yourname@okbank" className="field" autoComplete="off" />
            <p className="mt-1 text-[0.92rem] text-muted">To see a failed payment, enter fail@upi.</p>
          </div>
        )}
        {method === "card" && (
          <>
            <div>
              <label className="label" htmlFor="card">
                Card number
              </label>
              <input id="card" value={card} onChange={(e) => setCard(e.target.value.replace(/[^\d ]/g, "").slice(0, 19))} required placeholder="4111 1111 1111 1111" inputMode="numeric" className="field tabular-nums" autoComplete="off" />
              <p className="mt-1 text-[0.92rem] text-muted">Don&apos;t enter a real card. Any number ending in 0000 is declined.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="expiry">
                  Expiry
                </label>
                <input id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" className="field" autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="cvv">
                  CVV
                </label>
                <input id="cvv" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="123" inputMode="numeric" className="field" autoComplete="off" />
              </div>
            </div>
          </>
        )}
        {method === "netbanking" && (
          <div>
            <label className="label" htmlFor="bank">
              Your bank
            </label>
            <select id="bank" value={bank} onChange={(e) => setBank(e.target.value)} className="field">
              {BANKS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {signedIn && (
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="size-5 accent-[var(--color-sign)]" />
          Save this connection to my account
        </label>
      )}

      {error && (
        <p role="alert" className="mt-3 border-l-4 border-alert pl-3 font-semibold text-alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn btn-mark">Pay {rupees(bill.amount)} now</button>
        <span className="text-[0.92rem] text-muted">Simulated payment. No money moves.</span>
      </div>
    </motion.form>
  );
}
