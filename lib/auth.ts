// Simple login gate. Change the defaults below (or set the env vars in .env.local / Vercel).
export const SESSION_COOKIE = "gpp_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 30; // stay signed in for 30 days

export function authConfig() {
  return {
    user: process.env.APP_USERNAME ?? "admin",
    pass: process.env.APP_PASSWORD ?? "gpp@1234",
    secret: process.env.AUTH_SECRET ?? "gpp-change-this-secret",
  };
}

async function hmac(message: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** constant-time string compare */
export function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${exp}.${await hmac(String(exp), authConfig().secret)}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, await hmac(exp, authConfig().secret));
}
