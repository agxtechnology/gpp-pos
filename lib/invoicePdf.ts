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

// The built-in PDF fonts only cover Latin characters.
const SUPPORTED = /[\u0020-\u007E\u00A0-\u00FF\u2122\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/;

/** Fetch the logo in the browser and read its size. */
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
  const LIMIT = H - FOOT - 16; // lowest y for content

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (style: "normal" | "bold", size: number, color: RGB) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    ink(color);
  };
  /** text with letter-spacing; align left/right */
  const spaced = (s: string, x: number, y: number, cs: number, align: "left" | "right" | "center" = "left") => {
    const str = t(s);
    const w = doc.getTextWidth(str) + cs * Math.max(0, str.length - 1);
    doc.setCharSpace(cs);
    doc.text(str, align === "right" ? x - w : align === "center" ? x - w / 2 : x, y);
    doc.setCharSpace(0);
    return w;
  };
  const eyebrow = (s: string, x: number, y: number, align: "left" | "right" = "left") => {
    font("bold", 7, C.gold);
    spaced(s, x, y, 0.45, align);
  };

  const GS = (doc as unknown as { GState: new (o: { opacity: number }) => never }).GState;
  const opacity = (o: number) => doc.setGState(new GS({ opacity: o }));

  const frameTop = () => {
    fill(C.brand);
    doc.rect(0, 0, W, 1.6, "F");
  };

  // ---------- page 1 header ----------
  frameTop();
  let y = 15.6;
  const logoW = 62;
  const logoH = logo ? (logoW * logo.h) / logo.w : 28;
  if (logo) doc.addImage(logo.dataUrl, "PNG", M, y, logoW, logoH);

  font("normal", 24, C.brand);
  spaced("INVOICE", R, y + logoH - 4, 2.2, "right");

  y += logoH + 6;
  // gold divider that fades out to the right
  const segs = 40;
  for (let i = 0; i < segs; i++) {
    opacity(1 - i / segs);
    stroke(C.gold);
    doc.setLineWidth(0.3);
    doc.line(M + (CW / segs) * i, y, M + (CW / segs) * (i + 1) + 0.2, y);
  }
  opacity(1);
  y += 8;

  // ---------- invoice details strip ----------
  const stripH = 15.5;
  const cell = CW / 3;
  fill(C.zebra);
  stroke(C.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(M, y, CW, stripH, 2.5, 2.5, "FD");
  doc.line(M + cell, y + 2.5, M + cell, y + stripH - 2.5);
  doc.line(M + cell * 2, y + 2.5, M + cell * 2, y + stripH - 2.5);

  eyebrow("INVOICE NO", M + 5, y + 5.6);
  font("bold", 9.5, C.ink);
  doc.text(t(billNo(bill)), M + 5, y + 11.4);
  eyebrow("INVOICE DATE", M + cell + 5, y + 5.6);
  font("bold", 9.5, C.ink);
  doc.text(t(bill.bill_date), M + cell + 5, y + 11.4);
  eyebrow("STATUS", M + cell * 2 + 5, y + 5.6);
  font("bold", 7, status.fg);
  const stW = doc.getTextWidth(status.label) + 0.4 * status.label.length + 7;
  fill(status.bg);
  doc.roundedRect(M + cell * 2 + 5, y + 7.4, stW, 5.4, 2.7, 2.7, "F");
  doc.setCharSpace(0.4);
  doc.text(status.label, M + cell * 2 + 5 + stW / 2 + 0.2, y + 11, { align: "center" });
  doc.setCharSpace(0);
  y += stripH + 6;

  // ---------- billed to / from ----------
  const PW = 87;
  const partyTop = y;
  const drawParty = (x: number, label: string, name: string, rows: [string, string][], bar: RGB) => {
    eyebrow(label, x + 5, partyTop + 5.2);
    font("bold", 11.5, C.ink);
    const nl = doc.splitTextToSize(t(name), PW - 10) as string[];
    doc.text(nl, x + 5, partyTop + 11.4);
    let yy = partyTop + 11.4 + (nl.length - 1) * 4.8 + 5.4;
    rows.forEach(([lab, val]) => {
      font("bold", 6.5, C.mute);
      doc.text(lab.toUpperCase(), x + 5, yy);
      font("normal", 9, C.text);
      const vl = doc.splitTextToSize(t(val), PW - 10 - 17) as string[];
      doc.text(vl, x + 22, yy);
      yy += vl.length * 4.4 + 1.2;
    });
    return { end: yy + 1.2, bar, x };
  };
  const billRows: [string, string][] = [];
  if (customer.phone) billRows.push(["Tel", customer.phone]);
  if (customer.address) billRows.push(["Address", customer.address]);
  const boxL = drawParty(M, "BILLED TO", customer.name, billRows, C.gold);
  const boxR = drawParty(R - PW, "FROM", brandName, [["Address", SHOP.address], ["Tel", SHOP.phone]], C.brand);
  const partyEnd = Math.max(boxL.end, boxR.end, partyTop + 24);
  [boxL, boxR].forEach((b) => {
    stroke(C.line);
    doc.setLineWidth(0.25);
    doc.roundedRect(b.x, partyTop, PW, partyEnd - partyTop, 2, 2, "S");
    fill(b.bar);
    doc.rect(b.x, partyTop + 0.4, 0.9, partyEnd - partyTop - 0.8, "F");
  });
  y = partyEnd + 8;

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
    const lines = doc.splitTextToSize(t(it.item_name), 88) as string[];
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

  eyebrow("PAYMENT DETAILS", M, y);
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
