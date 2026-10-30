"use client";

import { useTransition } from "react";
import { removeConnection } from "@/lib/actions";
import type { ServiceId } from "@/lib/types";

export function RemoveConnection({ service, consumerNo }: { service: ServiceId; consumerNo: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className="link text-[0.9rem] text-muted" onClick={() => start(() => removeConnection(service, consumerNo))}>
      {pending ? "Removing" : "Remove"}
    </button>
  );
}
