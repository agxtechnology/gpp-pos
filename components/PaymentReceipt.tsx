"use client";
import { useState } from "react";
import { SHOP, brandName, money } from "../lib/shop";
import { buildReceiptPdf } from "../lib/receiptPdf";
import { loadLogo } from "../lib/invoicePdf";
import type { Payment, Customer, Bill } from "../lib/types";
import { btn } from "./ui";

export function PaymentReceipt({
  payment,
  customer,
  bill,
  balance,
  onClose,
}: {
  payment: Payment;
  customer: Customer;
  bill?: Bill | null;
  balance: number;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const dateStr = String(payment.paid_at).slice(0, 10).replace(/-/g, "");
  const receiptId = `REC-${dateStr}-${String(payment.id).padStart(4, "0")}`;

  async function downloadPdf() {
    setBusy(true);
    try {
      const logo = await loadLogo(SHOP.logo).catch(() => null);
      const { blob, fileName } = await buildReceiptPdf({
        payment,
        customer,
        bill,
        currentBalance: balance,
        logo,
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (e) {
      alert("Could not generate PDF receipt.");
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        
        {/* The Receipt UI */}
        <div className="p-8 pb-4">
          <div className="flex items-start justify-between border-b border-stone-200 pb-6">
            <div>
              <h2 className="text-2xl font-light tracking-widest text-brand">RECEIPT</h2>
              <p className="mt-1 text-sm font-semibold text-stone-500">#{receiptId}</p>
            </div>
            <img src={SHOP.logoMark || SHOP.logo} alt="Logo" className="h-10 object-contain" />
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Received From</p>
              <p className="mt-1 text-base font-bold text-stone-900">{customer.name}</p>
              {customer.phone && <p className="text-sm text-stone-600">{customer.phone}</p>}
            </div>

            <div className="rounded-xl bg-stone-50 p-4">
              <div className="flex justify-between items-center border-b border-stone-200 pb-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-stone-900 capitalize">
                    {payment.method} {payment.cheque_no ? `(#${payment.cheque_no})` : ""}
                  </p>
                  <p className="text-xs text-stone-500">Date: {String(payment.paid_at).slice(0, 10)}</p>
                </div>
                <p className="text-lg font-bold text-emerald-600">{money(payment.amount)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-stone-600">Remaining Balance</p>
                <p className="text-base font-bold text-red-600">{money(balance)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 border-t border-stone-100 p-4 bg-stone-50 rounded-b-2xl">
          <button onClick={onClose} className={`${btn("ghost")} flex-1`}>
            Close
          </button>
          <button onClick={downloadPdf} disabled={busy} className={`${btn("wa")} flex-1`}>
            {busy ? "Downloading..." : "Download PDF"}
          </button>
        </div>
        
      </div>
    </div>
  );
}