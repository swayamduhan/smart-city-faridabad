"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reports", label: "Citizen reports" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/announcements", label: "Notices" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/candidates", label: "Candidates" },
  { href: "/admin/users", label: "Accounts" },
];

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <p className="font-bold">City admin</p>
      <p className="text-[0.95rem] text-muted">{name}</p>
      <nav aria-label="Admin" className="scroll-x -mx-4 mt-3 flex gap-1.5 px-4 lg:mx-0 lg:grid lg:gap-0.5 lg:px-0">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded px-3 py-2 pt-2.5 font-semibold transition-colors ${active ? "bg-sign text-white" : "hover:bg-sign/10"}`}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="mt-3 hidden lg:block">
        <button className="link px-3 text-[0.95rem] text-muted">Sign out</button>
      </form>
    </aside>
  );
}
