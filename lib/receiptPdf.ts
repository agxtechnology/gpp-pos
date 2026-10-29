import { SHOP, brandName, fmt } from "./shop";
import type { Payment, Customer, Bill } from "./types";

type RGB = readonly [number, number, number];
const C = {
  brand: [44, 61, 87] as RGB,
  text: [68, 64, 60] as RGB,
  mute: [120, 113, 108] as RGB,
  line: [231, 229, 228] as RGB,
  green: [6, 95, 70] as RGB,
  red: [153, 27, 27] as RGB,
  white: [255, 255, 255] as RGB,
};

export async function buildReceiptPdf({
  payment,
  customer,
  bill,
  currentBalance,
  logo,
}: {
  payment: Payment;
  customer: Customer;
  bill?: Bill | null;
  currentBalance: number; // This is the NEW balance after this payment
  logo: { dataUrl: string; w: number; h: number } | null;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

  const W = 210, M = 14, CW = 182, R = M + CW;
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (style: "normal" | "bold", size: number, color: RGB) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    ink(color);
  };

  let y = 20;

  // Header
  if (logo) {
    const logoW = 45;
    const logoH = (logoW * logo.h) / logo.w;
    doc.addImage(logo.dataUrl, "PNG", M, y, logoW, logoH);
  } else {
    font("bold", 20, C.brand);
    doc.text(brandName, M, y + 10);
  }

  font("bold", 26, C.brand);
  doc.text("PAYMENT RECEIPT", R, y + 10, { align: "right" });
  
  y += 25;

  // Receipt ID and Date
  const dateStr = String(payment.paid_at).slice(0, 10).replace(/-/g, "");
  const receiptId = `REC-${dateStr}-${String(payment.id).padStart(4, "0")}`;

  font("normal", 10, C.mute);
  doc.text(`Receipt No:`, M, y);
  font("bold", 11, C.text);
  doc.text(receiptId, M + 22, y);

  font("normal", 10, C.mute);
  doc.text(`Date:`, R - 45, y);
  font("bold", 11, C.text);
  doc.text(String(payment.paid_at).slice(0, 10), R, y, { align: "right" });
  
  y += 8;

  // Divider
  stroke(C.line);
  doc.setLineWidth(0.3);
  doc.line(M, y, R, y);
  y += 10;

  // Customer Info
  font("bold", 9, C.mute);
  doc.text("RECEIVED FROM", M, y);
  y += 6;
  
  font("bold", 14, C.text);
  doc.text(customer.name, M, y);
  y += 6;
  
  font("normal", 10, C.mute);
  if (customer.phone) {
    doc.text(`Tel: ${customer.phone}`, M, y);
    y += 5;
  }
  if (customer.address) {
    doc.text(`Address: ${customer.address}`, M, y);
    y += 5;
  }

  y += 10;

  // Payment Details Table Header
  fill(C.brand);
  doc.rect(M, y, CW, 10, "F");
  font("bold", 9, C.white);
  doc.text("DESCRIPTION", M + 4, y + 6.5);
  doc.text("AMOUNT", R - 4, y + 6.5, { align: "right" });
  y += 10;

  // Payment Row
  stroke(C.line);
  doc.line(M, y + 12, R, y + 12);
  
  font("bold", 11, C.text);
  let desc = `Payment via ${payment.method.toUpperCase()}`;
  if (payment.method === "cheque") desc += ` (Cheque #: ${payment.cheque_no})`;
  doc.text(desc, M + 4, y + 7);

  font("bold", 12, C.green);
  doc.text(`Rs. ${fmt(payment.amount)}`, R - 4, y + 7, { align: "right" });
  
  if (payment.note) {
    font("normal", 9, C.mute);
    doc.text(`Note: ${payment.note}`, M + 4, y + 11);
  }
  
  y += 20;

  // Totals Section (Ledger Style)
  const boxW = 90;
  const boxX = R - boxW;

  // Calculate Previous Balance
  const previousBalance = currentBalance + payment.amount;

  // 1. Previous Balance
  font("normal", 10, C.mute);
  doc.text("Previous Balance:", boxX, y);
  font("bold", 10, C.text);
  doc.text(`Rs. ${fmt(previousBalance)}`, R, y, { align: "right" });
  y += 6;

  // 2. Paid Amount
  font("normal", 10, C.mute);
  doc.text("Amount Paid:", boxX, y);
  font("bold", 10, C.green);
  doc.text(`- Rs. ${fmt(payment.amount)}`, R, y, { align: "right" });
  y += 4;

  // Divider line
  stroke(C.line);
  doc.line(boxX, y, R, y);
  y += 6;

  // 3. Total Remaining Balance
  font("bold", 10, C.text);
  doc.text("Total Remaining Balance:", boxX, y);
  font("bold", 14, currentBalance > 0 ? C.red : C.green);
  doc.text(`Rs. ${fmt(currentBalance)}`, R, y, { align: "right" });

  y += 20;

  // Footer
  y = 270;
  stroke(C.line);
  doc.line(M, y, R, y);
  y += 8;
  font("normal", 9, C.mute);
  doc.text(`Thank you for your payment!`, W / 2, y, { align: "center" });
  y += 5;
  doc.text(`${brandName} · ${SHOP.address} · Tel ${SHOP.phone} · ${SHOP.website}`, W / 2, y, { align: "center" });

  return { blob: doc.output("blob") as Blob, fileName: `${receiptId}.pdf` };
}