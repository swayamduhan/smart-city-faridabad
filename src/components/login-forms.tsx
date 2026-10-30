"use client";

import { useActionState, useState, useTransition } from "react";
import { demoSignIn, signIn, signUp } from "@/lib/actions";

export function LoginForms({ next, wards }: { next?: string; wards: { number: number; name: string }[] }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inError, inAction, inPending] = useActionState(signIn, null);
  const [upError, upAction, upPending] = useActionState(signUp, null);
  const [demoPending, startDemo] = useTransition();

  return (
    <div className="grid gap-12 md:grid-cols-[1.1fr_1fr]">
      <div>
        <div className="flex gap-2" role="group" aria-label="Sign in or create an account">
          <button type="button" className="filter" aria-pressed={mode === "in"} onClick={() => setMode("in")}>
            Sign in
          </button>
          <button type="button" className="filter" aria-pressed={mode === "up"} onClick={() => setMode("up")}>
            Create an account
          </button>
        </div>

        {mode === "in" ? (
          <form action={inAction} className="mt-6 grid gap-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
            </div>
            {inError && (
              <p role="alert" className="font-semibold text-alert">
                {inError}
              </p>
            )}
            <button className="btn btn-mark justify-self-start" disabled={inPending}>
              {inPending ? "Signing in" : "Sign in"}
            </button>
          </form>
        ) : (
          <form action={upAction} className="mt-6 grid gap-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input id="name" name="name" autoComplete="name" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="new-email">
                Email
              </label>
              <input id="new-email" name="email" type="email" autoComplete="email" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="new-password">
                Password
              </label>
              <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="ward">
                Your ward
              </label>
              <select id="ward" name="ward" className="field" defaultValue="18">
                {wards.map((w) => (
                  <option key={w.number} value={w.number}>
                    Ward {w.number}: {w.name}
                  </option>
                ))}
              </select>
            </div>
            {upError && (
              <p role="alert" className="font-semibold text-alert">
                {upError}
              </p>
            )}
            <button className="btn btn-mark justify-self-start" disabled={upPending}>
              {upPending ? "Creating your account" : "Create account"}
            </button>
          </form>
        )}
      </div>

      <aside className="border-t-2 border-ink pt-4 md:border-l-2 md:border-t-0 md:pl-10 md:pt-0">
        <h2 className="display text-2xl">Showing this to someone?</h2>
        <p className="mt-2 max-w-[42ch] text-muted">Open a ready-made account in one click. The citizen account already has bills, reports and an application in it.</p>
        <div className="mt-4 grid justify-items-start gap-3">
          <button type="button" className="btn btn-mark" disabled={demoPending} onClick={() => startDemo(() => demoSignIn("citizen", next))}>
            Continue as demo citizen
          </button>
          <button type="button" className="btn btn-line" disabled={demoPending} onClick={() => startDemo(() => demoSignIn("admin"))}>
            Continue as demo admin
          </button>
        </div>
        <p className="mt-4 text-[0.95rem] text-muted">
          You can also sign in with citizen@faridabad.demo or admin@faridabad.demo. The password for both is demo1234.
        </p>
      </aside>
    </div>
  );
}
