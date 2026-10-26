import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_SECONDS, authConfig, createSessionToken, safeEqual } from "../../../lib/auth";

export async function POST(request: Request) {
  const { username = "", password = "" } = await request.json().catch(() => ({}));
  const cfg = authConfig();

  const ok = safeEqual(String(username).trim(), cfg.user) && safeEqual(String(password), cfg.pass);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return res;
}
