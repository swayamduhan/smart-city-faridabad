import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:px-8">
      <AdminNav name={admin.name} />
      <div className="min-w-0 pt-6 lg:pt-0">{children}</div>
    </div>
  );
}
