"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions";

export function ProfileForm({ name, phone, email, ward, wards }: { name: string; phone: string; email: string; ward: number; wards: { number: number; name: string }[] }) {
  const [message, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="mt-3 grid gap-3">
      <div>
        <label className="label" htmlFor="p-name">
          Full name
        </label>
        <input id="p-name" name="name" defaultValue={name} className="field" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="p-email">
          Email
        </label>
        <input id="p-email" value={email} readOnly className="field bg-ground text-muted" />
      </div>
      <div>
        <label className="label" htmlFor="p-phone">
          Phone
        </label>
        <input id="p-phone" name="phone" defaultValue={phone} className="field" autoComplete="tel" />
      </div>
      <div>
        <label className="label" htmlFor="p-ward">
          Your ward
        </label>
        <select id="p-ward" name="ward" defaultValue={ward} className="field">
          {wards.map((w) => (
            <option key={w.number} value={w.number}>
              Ward {w.number}: {w.name}
            </option>
          ))}
        </select>
      </div>
      {message && (
        <p role="status" className={`font-semibold ${message === "Profile saved." ? "text-sign" : "text-alert"}`}>
          {message}
        </p>
      )}
      <button className="btn btn-mark justify-self-start" disabled={pending}>
        {pending ? "Saving" : "Save details"}
      </button>
    </form>
  );
}
