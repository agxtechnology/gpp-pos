import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Nav from "../components/Nav";
import { SHOP } from "../lib/shop";

export const metadata: Metadata = {
  title: `${SHOP.name} – Billing`,
  description: "E-bills, customers and payment tracking",
  applicationName: "GPP Billing",
  appleWebApp: { capable: true, title: "GPP Billing", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-paper text-stone-700 antialiased">
        {/* usePathname() inside Nav needs a Suspense boundary (Next 16 Cache Components) */}
        <Suspense fallback={<div className="h-14 border-b border-gold/30 bg-white" />}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-4xl px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-10 print:max-w-none print:p-0">
          {children}
        </main>
      </body>
    </html>
  );
}
