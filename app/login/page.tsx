"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SHOP } from "../../lib/shop";
import { btn, errBox, inp, label } from "../../components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!username.trim() || !password) return setErr("Enter your username and password.");
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Could not sign in. Try again.");
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setErr("Network error. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-sm flex-col justify-center py-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_8px_30px_rgba(25,18,60,0.08)] sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SHOP.logo} alt={SHOP.name} className="mx-auto w-56" />
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <h1 className="text-center text-lg font-bold text-ink">Sign in</h1>
        <p className="mt-0.5 text-center text-sm text-stone-500">Billing &amp; payments</p>

        <form onSubmit={submit} className="mt-4" noValidate>
          <label className={label} htmlFor="u">Username</label>
          <input
            id="u"
            className={inp}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Username"
          />

          <label className={label} htmlFor="p">Password</label>
          <div className="relative">
            <input
              id="p"
              className={`${inp} pr-16`}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-brand"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          {err && <p className={`${errBox} mt-4`} role="alert">{err}</p>}

          <button className={`${btn()} mt-5 w-full !min-h-12 text-base`} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
      <p className="mt-5 text-center text-xs text-stone-400">
        {SHOP.name}{SHOP.mark} · {SHOP.address}
      </p>
    </div>
  );
}
