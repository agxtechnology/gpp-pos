// Edit your shop details here – they appear on every e-bill.
export const SHOP = {
  name: "Gopal Picture Palace",
  mark: "™", // trademark symbol shown after the name
  address: "Kurunegala",
  phone: "07X XXX XXXX",
  website: "https://gpp-site.vercel.app",
  logo: "/logo.png", // full logo (GPP + lotus + name)
  logoMark: "/logo-mark.png", // GPP monogram only (header)
};

export const websiteLabel = SHOP.website.replace(/^https?:\/\//, "");

/** Gopal Picture Palace™ */
export const brandName = `${SHOP.name}${SHOP.mark}`;

/** 12,500.00 */
export const fmt = (n: number | string | null | undefined) =>
  Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Rs. 12,500.00 */
export const money = (n: number | string | null | undefined) => "Rs. " + fmt(n);

/** Invoice number shown on the bill: 20261026-RAJA-GOPAL (old bills fall back to GPP-00012) */
export const billNo = (b: { id: number; invoice_no?: string | null }) =>
  b.invoice_no || `GPP-${String(b.id).padStart(5, "0")}`;

/** Base invoice number = bill date + customer name  ->  20261026-RAJA-GOPAL */
export function invoiceNoBase(date: string, customerName: string) {
  const ymd = date.replace(/-/g, "");
  const slug = customerName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16)
    .replace(/-+$/, "");
  return `${ymd}-${slug || "CUSTOMER"}`;
}

/** If the same customer already has a bill that day, add -2, -3 … */
export function nextInvoiceNo(base: string, existing: string[]) {
  const used = new Set(existing);
  let candidate = base;
  for (let i = 2; used.has(candidate); i++) candidate = `${base}-${i}`;
  return candidate;
}

/** WhatsApp chat link (07XXXXXXXX -> 947XXXXXXXX) */
export function waLink(phone: string | null | undefined, text: string) {
  let d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "94" + d.slice(1);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
