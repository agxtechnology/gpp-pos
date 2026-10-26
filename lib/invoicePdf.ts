import { SHOP, brandName, websiteLabel, fmt, money, billNo } from "./shop";
import { billStatus, sum } from "./data";
import type { Bill, BillItem, Customer, Payment } from "./types";

export type Logo = { dataUrl: string; w: number; h: number };

export type InvoicePdfInput = {
  bill: Bill;
  customer: Customer;
  items: BillItem[];
  pays: Payment[]; // payments linked to THIS bill
  outstanding: number; // customer's total balance (all bills)
  logo: Logo | null;
};

type RGB = readonly [number, number, number];
const C = {
  brand: [44, 61, 87] as RGB,
  gold: [156, 139, 94] as RGB,
  ink: [25, 18, 60] as RGB,
  text: [68, 64, 60] as RGB,
  mute: [120, 113, 108] as RGB,
  line: [231, 229, 228] as RGB,
  zebra: [250, 250, 249] as RGB,
  white: [255, 255, 255] as RGB,
};

const STATUS: Record<ReturnType<typeof billStatus>, { label: string; bg: RGB; fg: RGB }> = {
  paid: { label: "PAID", bg: [209, 250, 229], fg: [6, 95, 70] },
  partial: { label: "PARTIAL", bg: [254, 243, 199], fg: [146, 64, 14] },
  unpaid: { label: "UNPAID", bg: [254, 226, 226], fg: [153, 27, 27] },
  cheque: { label: "CHEQUE PENDING", bg: [224, 242, 254], fg: [7, 89, 133] },
};

const SUPPORTED = /[\u0020-\u007E\u00A0-\u00FF\u2122\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/;

export async function loadLogo(url: string): Promise<Logo> {
  const blob = await (await fetch(url)).blob();
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
  const { w, h } = await new Promise<{ w: number; h: number }>((res, rej) => {
    const im = new Image();
    im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => rej(new Error("logo"));
    im.src = dataUrl;
  });
  return { dataUrl, w, h };
}

/**
 * Builds a real A4 PDF that mirrors the printed e-bill (vector text, small file).
 * `lossy` = true when some characters (e.g. Sinhala/Tamil) could not be drawn.
 */
export async function buildInvoicePdf(inp: InvoicePdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

  let lossy = false;
  const t = (s: string) =>
    Array.from(s)
      .map((ch) => (SUPPORTED.test(ch) ? ch : ((lossy = true), "?")))
      .join("");

  const { bill, customer, items, pays, outstanding, logo } = inp;
  const received = sum(pays.filter((p) => p.status === "received"), (p) => p.amount);
  const pending = sum(pays.filter((p) => p.status === "pending"), (p) => p.amount);
  const balance = Number(bill.total) - received;
  const status = STATUS[billStatus(Number(bill.total), received, pending)];
  const showOutstanding = Math.abs(outstanding - balance) > 0.004;

  const W = 210, H = 297, M = 14, CW = 182, R = M + CW;
  const FOOT = 11;
  const LIMIT = H - FOOT - 16;

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (style: "normal" | "bold", size: number, color: RGB) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    ink(color);
  };

  const spaced = (s: string, x: number, y: number, cs: number, align: "left" | "right" | "center" = "left") => {
    const str = t(s);
    const w = doc.getTextWidth(str) + cs * Math.max(0, str.length - 1);
    doc.setCharSpace(cs);
    doc.text(str, align === "right" ? x - w : align === "center" ? x - w / 2 : x, y);
    doc.setCharSpace(0);
    return w;
  };

  /** Helper to draw clickable links */
  const textWithLink = (text: string, x: number, y: number, url: string) => {
    doc.textWithLink(t(text), x, y, { url });
  };
  
  const frameTop = () => {
    fill(C.brand);
    doc.rect(0, 0, W, 1.6, "F");
  };

  // ---------- page 1 header ----------
  frameTop();
  let y = 15.6;
  
  // Logo
  const logoW = 50;
  const logoH = logo ? (logoW * logo.h) / logo.w : 25;
  if (logo) doc.addImage(logo.dataUrl, "PNG", M, y, logoW, logoH);

  // INVOICE text
  font("normal", 24, C.brand);
  spaced("INVOICE", R, y + logoH - 6, 2.2, "right");

  y += Math.max(logoH, 25) + 8; 
  
  // Divider line
  stroke(C.line);
  doc.setLineWidth(0.3);
  doc.line(M, y, R, y);
  y += 8;

  // ---------- 3 Info Columns ----------
  const colWidth = CW / 3;
  
  // Bill To
  font("bold", 7, C.mute);
  spaced("BILL TO", M, y, 0.45);
  font("bold", 10, C.ink);
  let by = y + 5;
  doc.text(t(customer.name), M, by);
  by += 4.5;
  if (customer.address) {
    font("normal", 8.5, C.text);
    const lines = doc.splitTextToSize(t(`Address: ${customer.address}`), colWidth - 4);
    doc.text(lines, M, by);
    by += lines.length * 4;
  }
  if (customer.phone) {
    font("normal", 8.5, C.text);
    // Clickable tel:
    textWithLink(`Tel: ${customer.phone}`, M, by, `tel:${customer.phone.replace(/\s/g, '')}`);
  }

  // From
  font("bold", 7, C.mute);
  spaced("FROM", M + colWidth, y, 0.45);
  font("bold", 10, C.ink);
  let fy = y + 5;
  doc.text(t(brandName), M + colWidth, fy);
  fy += 4.5;
  font("normal", 8.5, C.text);
  const fromLines = doc.splitTextToSize(t(`Address: ${SHOP.address}`), colWidth - 4);
  doc.text(fromLines, M + colWidth, fy);
  fy += fromLines.length * 4;
  
  // Clickable tel:
  textWithLink(`Tel: ${SHOP.phone}`, M + colWidth, fy, `tel:${SHOP.phone.replace(/\s/g, '')}`);
  fy += 4;
  // Clickable web:
  textWithLink(`${websiteLabel}`, M + colWidth, fy, SHOP.website);

  // Invoice Details
  font("bold", 7, C.mute);
  spaced("INVOICE DETAILS", M + colWidth * 2, y, 0.45);
  let dy = y + 5;
  
  // Invoice No
  font("normal", 8.5, C.text);
  doc.text("Invoice No :", M + colWidth * 2, dy);
  font("bold", 7.5, C.ink); 
  const invNoWidth = doc.getTextWidth(t(billNo(bill)));
  doc.text(t(billNo(bill)), R - invNoWidth, dy);
  dy += 5;

  // Invoice Date
  font("normal", 8.5, C.text);
  doc.text("Invoice Date :", M + colWidth * 2, dy);
  font("bold", 8.5, C.ink);
  const dateWidth = doc.getTextWidth(t(bill.bill_date));
  doc.text(t(bill.bill_date), R - dateWidth, dy);
  dy += 5;

  // Status
  font("normal", 8.5, C.text);
  doc.text("Status :", M + colWidth * 2, dy);
  font("bold", 7, status.fg);
  const stW = doc.getTextWidth(status.label) + 0.4 * status.label.length + 7;
  fill(status.bg);
  doc.roundedRect(M + colWidth * 2 + 15, dy - 3.5, stW, 5.4, 2.7, 2.7, "F");
  doc.setCharSpace(0.4);
  doc.text(status.label, M + colWidth * 2 + 15 + stW / 2 + 0.2, dy, { align: "center" });
  doc.setCharSpace(0);

  y += 32;

  // ---------- items table ----------
  const X_DESC = M + 4, X_PRICE = 132, X_QTY = 154, X_AMT = R - 4;
  const tableHead = () => {
    fill(C.brand);
    doc.roundedRect(M, y, CW, 9, 1.6, 1.6, "F");
    font("bold", 7, C.white);
    spaced("DESCRIPTION", X_DESC, y + 5.7, 0.35);
    spaced("PRICE", X_PRICE, y + 5.7, 0.35, "right");
    spaced("QTY", X_QTY, y + 5.7, 0.35, "right");
    spaced("AMOUNT", X_AMT, y + 5.7, 0.35, "right");
    y += 9;
  };
  tableHead();

  items.forEach((it, n) => {
    font("normal", 9, C.ink);
    const lines = doc.splitTextToSize(t(it.item_name), 88);
    const rowH = Math.max(9.5, lines.length * 4.4 + 5);
    if (y + rowH > LIMIT) {
      doc.addPage();
      frameTop();
      y = 16;
      tableHead();
    }
    if (n % 2) { fill(C.zebra); doc.rect(M, y, CW, rowH, "F"); }
    font("normal", 9, C.ink);
    doc.text(lines, X_DESC, y + 6);
    font("normal", 9, C.text);
    doc.text(t(fmt(it.price)), X_PRICE, y + 6, { align: "right" });
    doc.text(t(String(Number(it.qty))), X_QTY, y + 6, { align: "right" });
    font("bold", 9, C.ink);
    doc.text(t(fmt(it.amount)), X_AMT, y + 6, { align: "right" });
    stroke(C.line);
    doc.setLineWidth(0.2);
    doc.line(M, y + rowH, R, y + rowH);
    y += rowH;
  });
  font("normal", 7, C.mute);
  doc.text("Amounts in Sri Lankan Rupees (Rs.)", R, y + 4.5, { align: "right" });
  y += 12;

  // ---------- payment details + totals ----------
  const LEFT_W = 100;
  const X0 = R - 72;
  const payRows = pays.map((p) => {
    const left = `${p.method.charAt(0).toUpperCase()}${p.method.slice(1)}${p.cheque_no ? ` #${p.cheque_no}` : ""}${
      p.cheque_date ? ` (${p.cheque_date})` : ""
    }`;
    return { left: t(left), status: t(`- ${p.status}`), amount: t(fmt(p.amount)) };
  });
  const noteLines = bill.notes ? (doc.splitTextToSize(t(`Note: ${bill.notes}`), LEFT_W) as string[]) : [];
  const leftH = 8 + Math.max(1, payRows.length) * 6.4 + (noteLines.length ? noteLines.length * 4 + 4 : 0);
  const rightH = 8 + (pending > 0 ? 21 : 14) + 14 + (showOutstanding ? 8 : 0);
  if (y + Math.max(leftH, rightH) > LIMIT) {
    doc.addPage();
    frameTop();
    y = 18;
  }

  font("bold", 7, C.gold);
  spaced("PAYMENT DETAILS", M, y, 0.45);
  let py = y + 7;
  if (!payRows.length) {
    font("normal", 9, C.mute);
    doc.text("No payment received yet.", M, py);
    py += 6;
  } else {
    payRows.forEach((p) => {
      font("normal", 9, C.text);
      doc.text(p.left, M, py);
      font("normal", 9, C.mute);
      doc.text(p.status, M + doc.getTextWidth(p.left) + 1.6, py);
      font("bold", 9, C.ink);
      doc.text(p.amount, M + LEFT_W, py, { align: "right" });
      stroke(C.line);
      doc.setLineWidth(0.15);
      doc.line(M, py + 2.2, M + LEFT_W, py + 2.2);
      py += 6.4;
    });
  }
  if (noteLines.length) {
    font("normal", 8, C.mute);
    doc.text(noteLines, M, py + 2);
  }

  let ry = y + 5;
  const totalRow = (label: string, value: string) => {
    font("normal", 9, C.mute);
    doc.text(label, X0, ry);
    font("bold", 9, C.ink);
    doc.text(t(value), R, ry, { align: "right" });
    ry += 7;
  };
  totalRow("Total", money(bill.total));
  totalRow("Paid", money(received));
  if (pending > 0) totalRow("Cheque pending", money(pending));
  ry += 0.5;
  fill(C.brand);
  doc.roundedRect(X0, ry - 5, 72, 11.5, 1.8, 1.8, "F");
  font("bold", 7.5, C.white);
  spaced("BALANCE DUE", X0 + 4, ry + 1.6, 0.4);
  font("bold", 10.5, C.white);
  doc.text(t(money(balance)), R - 4, ry + 1.9, { align: "right" });
  ry += 12;
  if (showOutstanding) {
    font("normal", 8, C.mute);
    doc.text("Total outstanding (all bills)", X0, ry);
    font("bold", 8, C.mute);
    doc.text(t(money(outstanding)), R, ry, { align: "right" });
  }

  // thank-you line (last page only)
  font("normal", 10, C.gold);
  spaced("Thank you for your business", W / 2, H - FOOT - 7, 0.3, "center");

  // ---------- footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    fill(C.brand);
    doc.rect(0, H - FOOT, W, FOOT, "F");
    fill(C.gold);
    doc.rect(0, H - FOOT, W, 0.6, "F");
    font("normal", 7.5, C.white);
    doc.text(t(`${brandName} · ${SHOP.address} · Tel ${SHOP.phone} · ${websiteLabel}`), W / 2, H - FOOT / 2 + 1.3, { align: "center" });
    if (pages > 1) {
      font("normal", 7, [190, 198, 210]);
      doc.text(`${i}/${pages}`, R, H - FOOT / 2 + 1.3, { align: "right" });
    }
  }

  const safe = billNo(bill).replace(/[^A-Za-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return { blob: doc.output("blob") as Blob, fileName: `${safe || "invoice"}.pdf`, lossy };
}