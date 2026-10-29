"use client";
import { useState } from "react";
import { SHOP, money, waLink } from "../lib/shop";
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
  const [busy, setBusy] = useState<"" | "pdf" | "wa">("");
  const [msg, setMsg] = useState<string | null>(null);

  const dateStr = String(payment.paid_at).slice(0, 10).replace(/-/g, "");
  const receiptId = `REC-${dateStr}-${String(payment.id).padStart(4, "0")}`;
  
  // Calculate Previous Balance
  const previousBalance = balance + payment.amount;

  async function downloadPdf() {
    setBusy("pdf");
    setMsg(null);
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
      
      setMsg("Receipt downloaded to your device.");
    } catch (e) {
      alert("Could not generate PDF receipt.");
    }
    setBusy("");
  }

  async function sendWhatsApp() {
    setBusy("wa");
    setMsg(null);
    try {
      const logo = await loadLogo(SHOP.logo).catch(() => null);
      const { blob, fileName } = await buildReceiptPdf({
        payment,
        customer,
        bill,
        currentBalance: balance,
        logo,
      });
      
      // Save the PDF to device first
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);

      // Open WhatsApp (no text, just the chat)
      const link = waLink(customer.phone, "");
      await new Promise((r) => setTimeout(r, 500)); // let the download start first
      
      if (link) {
        const w = window.open(link, "_blank");
        if (!w) window.location.assign(link);
        setMsg(`Receipt saved to Downloads. Opening WhatsApp…`);
      } else {
        setMsg(`Receipt saved. (Customer has no phone number to open WhatsApp).`);
      }
    } catch (e) {
      alert("Could not generate PDF receipt.");
    }
    setBusy("");
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
              
              {/* Ledger UI */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center text-stone-600">
                  <span>Previous Balance</span>
                  <span className="font-medium text-stone-900">{money(previousBalance)}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600">
                  <span>Amount Paid</span>
                  <span className="font-medium text-emerald-600">- {money(payment.amount)}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-stone-200 flex justify-between items-center">
                  <span className="font-bold text-stone-900">Total Remaining Balance</span>
                  <span className={`text-base font-bold ${balance > 0.004 ? "text-red-600" : "text-emerald-600"}`}>
                    {money(balance)}
                  </span>
                </div>
              </div>
            </div>

            {msg && (
              <p className="text-center text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 rounded-lg">
                {msg}
              </p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 border-t border-stone-100 p-4 bg-stone-50 rounded-b-2xl">
          <button 
            onClick={sendWhatsApp} 
            disabled={!!busy} 
            className={`${btn("wa")} w-full !min-h-12 text-base`}
          >
            {busy === "wa" ? "Preparing..." : "Send on WhatsApp"}
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className={`${btn("ghost")}`}>
              Close
            </button>
            <button onClick={downloadPdf} disabled={!!busy} className={`${btn("ghost")} !text-brand`}>
              {busy === "pdf" ? "Downloading..." : "Download PDF"}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}