import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForms } from "@/components/login-forms";
import { PageSign } from "@/components/page-sign";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const user = await currentUser();
  const nextPath = typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : undefined;
  if (user) redirect(nextPath ?? (user.role === "admin" ? "/admin" : "/account"));
  const wards = getDb().wards.map((w) => ({ number: w.number, name: w.name }));
  return (
    <>
      <PageSign title="Sign in" hi="साइन इन करें">
        Keep your bills, reports and job applications in one account.
      </PageSign>
      <div className="mx-auto max-w-5xl px-4 pt-10">
        <LoginForms next={nextPath} wards={wards} />
      </div>
    </>
  );
}
