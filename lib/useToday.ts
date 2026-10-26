"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Local date for event handlers (never call during render). */
export function localDate() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Today's local date (YYYY-MM-DD).
 * Returns "" during prerender, so Next.js never sees `new Date()` while rendering.
 */
export function useToday() {
  return useSyncExternalStore(subscribe, localDate, () => "");
}
