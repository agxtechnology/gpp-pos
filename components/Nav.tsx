"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SHOP } from "../lib/shop";

const icons = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z",
  plus: "M12 4v16M4 12h16",
  users:
    "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm10 8v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 5.2a3.5 3.5 0 0 1 0 6.6",
};

const links = [
  { href: "/", label: "Home", icon: icons.home },
  { href: "/newBill", label: "New Bill", icon: icons.plus },
  { href: "/customers", label: "Customers", icon: icons.users },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  if (path === "/login") return null;

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-3" aria-label={SHOP.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SHOP.logoMark} alt={SHOP.name} className="h-7 w-auto" />
            <span className="h-5 w-px bg-gold/50" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Billing</span>
          </Link>
          <nav className="ml-auto hidden gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  active(l.href) ? "bg-brand/5 text-brand" : "text-stone-500 hover:text-brand"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <button onClick={signOut} className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:text-brand md:ml-1">
            Sign out
          </button>
        </div>
      </header>

      {/* bottom tab bar (mobile app style) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
                active(l.href) ? "text-brand" : "text-stone-400"
              }`}
            >
              {active(l.href) && <span className="absolute top-0 h-0.5 w-9 rounded-full bg-gold" />}
              <Icon d={l.icon} />
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
