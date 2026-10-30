import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { dateShort } from "@/lib/format";

export const metadata: Metadata = { title: "Accounts" };

export default function AdminUsers() {
  const { users, reports, payments } = getDb();
  return (
    <>
      <h1 className="display text-[clamp(2.2rem,4.5vw,3.6rem)]">Accounts</h1>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-2 pr-4 font-bold">
                Name
              </th>
              <th scope="col" className="py-2 pr-4 font-bold">
                Email
              </th>
              <th scope="col" className="py-2 pr-4 font-bold">
                Role
              </th>
              <th scope="col" className="py-2 pr-4 font-bold">
                Ward
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-bold">
                Reports
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-bold">
                Payments
              </th>
              <th scope="col" className="py-2 font-bold">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line">
                <td className="py-2 pr-4 font-semibold">{u.name}</td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4 capitalize">{u.role}</td>
                <td className="py-2 pr-4 tabular-nums">{u.ward}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{reports.filter((r) => r.userId === u.id).length}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{payments.filter((p) => p.userId === u.id).length}</td>
                <td className="py-2">{dateShort(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
