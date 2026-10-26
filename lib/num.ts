/** Keep only digits and one decimal point (max `decimals` decimals). */
export function cleanDecimal(v: string, decimals = 2): string {
  let s = v.replace(/[^0-9.]/g, "");
  const i = s.indexOf(".");
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "");
  const [a, b] = s.split(".");
  if (b !== undefined) s = a + "." + b.slice(0, decimals);
  s = s.replace(/^0+(?=\d)/, ""); // 007 -> 7
  if (s.startsWith(".")) s = "0" + s; // .5 -> 0.5
  return s.slice(0, 12);
}

/** Digits only, optional leading +. */
export function cleanPhone(v: string): string {
  const s = v.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return s.slice(0, 13);
}

export const isValidPhone = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length >= 9 && d.length <= 12;
};

export const num = (s: string | number) => parseFloat(String(s)) || 0;
export const round2 = (n: number) => Math.round(n * 100) / 100;
