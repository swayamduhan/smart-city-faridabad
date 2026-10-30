import type { Metadata } from "next";
import { PageSign } from "@/components/page-sign";
import { PayFlow } from "@/components/pay-flow";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Pay bills" };

export default async function PayPage({ searchParams }: PageProps<"/pay">) {
  const { service, no } = await searchParams;
  const user = await currentUser();
  return (
    <>
      <PageSign title="Pay bills" hi="बिल भरें">
        Electricity, water, gas, property tax and more. Enter your number, check the amount, and pay.
      </PageSign>
      <div className="mx-auto max-w-[1200px] px-4 pt-8 lg:px-8">
        <PayFlow initialService={typeof service === "string" ? service : undefined} initialNo={typeof no === "string" ? no : undefined} connections={user?.connections ?? []} signedIn={!!user} />
      </div>
    </>
  );
}
