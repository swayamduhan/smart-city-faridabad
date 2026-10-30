import type { Bill, ServiceId } from "./types";

export interface Service {
  id: ServiceId;
  label: string;
  labelHi: string;
  numberLabel: string;
  sample: string;
  usageUnit: string;
  min: number;
  max: number;
  monthly: boolean;
}

export const SERVICES: Service[] = [
  { id: "electricity", label: "Electricity", labelHi: "बिजली", numberLabel: "Consumer account number", sample: "4410286753", usageUnit: "units", min: 420, max: 4800, monthly: true },
  { id: "water", label: "Water and sewerage", labelHi: "पानी और सीवर", numberLabel: "Water connection ID", sample: "210094417", usageUnit: "kilolitres", min: 180, max: 1250, monthly: true },
  { id: "gas", label: "Piped gas", labelHi: "पाइप गैस", numberLabel: "Customer ID", sample: "6600152089", usageUnit: "SCM", min: 240, max: 1600, monthly: true },
  { id: "property", label: "Property tax", labelHi: "संपत्ति कर", numberLabel: "Property ID", sample: "FBD147820", usageUnit: "sq yd assessed", min: 2200, max: 24000, monthly: false },
  { id: "waste", label: "Waste collection", labelHi: "कचरा शुल्क", numberLabel: "Household ID", sample: "SW3380412", usageUnit: "pickups", min: 90, max: 320, monthly: true },
  { id: "broadband", label: "Broadband", labelHi: "ब्रॉडबैंड", numberLabel: "Account number", sample: "9012004512", usageUnit: "GB", min: 499, max: 1499, monthly: true },
  { id: "mobile", label: "Mobile postpaid", labelHi: "मोबाइल पोस्टपेड", numberLabel: "Mobile number", sample: "9812345670", usageUnit: "GB", min: 299, max: 1199, monthly: true },
];

export const serviceById = (id: ServiceId) => SERVICES.find((s) => s.id === id)!;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const HOLDERS = ["Meera Rawat", "Devansh Khatri", "Sunita Gahlot", "Imran Qureshi", "Harpreet Sandhu", "Kavya Tanwar", "Rakesh Nagar", "Pooja Bhadana"];

/** Same number + month always gives the same bill, so a demo can be repeated reliably. */
export function quoteBill(service: ServiceId, consumerNo: string, now: Date, isPaid: (key: string) => boolean): Bill {
  const s = serviceById(service);
  const clean = consumerNo.trim().toUpperCase();
  const year = now.getFullYear();
  const month = now.getMonth();
  const periodKey = s.monthly ? `${year}-${String(month + 1).padStart(2, "0")}` : `FY${month >= 3 ? year : year - 1}`;
  const h = hash(`${service}:${clean}:${periodKey}`);
  const amount = Math.round((s.min + (h % 1000) / 1000 * (s.max - s.min)) / 5) * 5;
  const due = new Date(year, month, 12 + (h % 14));
  if (due < now) due.setMonth(due.getMonth() + 1);
  const previous = new Date(year, month - 1, 1);
  const period = s.monthly
    ? previous.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : `Financial year ${periodKey.slice(2)}–${String(Number(periodKey.slice(4)) + 1).slice(2)}`;
  const usageValue = s.id === "property" ? 100 + (h % 400) : Math.max(3, Math.round(amount / (s.id === "electricity" ? 7.2 : s.id === "water" ? 28 : 9)));
  const key = `${service}:${clean}:${periodKey}`;
  return {
    service,
    consumerNo: clean,
    holder: HOLDERS[h % HOLDERS.length],
    period,
    periodKey,
    amount,
    dueDate: due.toISOString(),
    usage: `${usageValue} ${s.usageUnit}`,
    paid: isPaid(key),
  };
}

export const billKey = (service: string, consumerNo: string, periodKey: string) => `${service}:${consumerNo.trim().toUpperCase()}:${periodKey}`;

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
