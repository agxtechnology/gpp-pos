"use client";
import type { InputHTMLAttributes } from "react";
import { cleanDecimal, cleanPhone } from "../lib/num";
import { inp } from "./ui";

type Base = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">;

/** Numbers only (digits + one decimal point). Shows the numeric keypad on mobile. */
export function NumInput({
  value,
  onChange,
  decimals = 2,
  className = "",
  ...rest
}: Base & { value: string; onChange: (v: string) => void; decimals?: number }) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.]?[0-9]*"
      autoComplete="off"
      className={`${inp} ${className}`}
      value={value}
      onChange={(e) => onChange(cleanDecimal(e.target.value, decimals))}
    />
  );
}

/** Phone: digits and an optional leading +. */
export function PhoneInput({
  value,
  onChange,
  className = "",
  ...rest
}: Base & { value: string; onChange: (v: string) => void }) {
  return (
    <input
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="off"
      className={`${inp} ${className}`}
      value={value}
      onChange={(e) => onChange(cleanPhone(e.target.value))}
    />
  );
}

/** Segmented control (big tap targets for mobile). */
export function Seg<T extends string>({
  value,
  onChange,
  options,
  cols = "grid-cols-3",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  cols?: string;
}) {
  return (
    <div role="radiogroup" className={`grid gap-1.5 rounded-xl bg-stone-100 p-1 ${cols}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 rounded-lg px-2 text-sm font-semibold transition ${
            value === o.value ? "bg-white text-brand shadow" : "text-stone-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
