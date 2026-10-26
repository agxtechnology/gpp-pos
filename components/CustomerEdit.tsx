"use client";
import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { isValidPhone } from "../lib/num";
import type { Customer } from "../lib/types";
import { PhoneInput } from "./Fields";
import { btn, errBox, inp, label } from "./ui";

/** Edit a customer's name, phone and address. */
export default function CustomerEdit({
  customer,
  onSaved,
  onCancel,
}: {
  customer: Customer;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (name.trim().length < 2) return setErr("Enter the customer name.");
    if (phone && !isValidPhone(phone)) return setErr("Enter a valid phone number (9–12 digits).");
    setBusy(true);
    const { error } = await supabase
      .from("customers")
      .update({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null })
      .eq("id", customer.id);
    setBusy(false);
    if (error) return setErr(error.message);
    onSaved();
  }

  return (
    <form onSubmit={save} noValidate>
      <label className={`${label} !mt-0`}>Name</label>
      <input className={inp} value={name} onChange={(e) => setName(e.target.value)} />
      <label className={label}>Phone</label>
      <PhoneInput placeholder="07X XXX XXXX" value={phone} onChange={setPhone} />
      <label className={label}>Address</label>
      <input className={inp} value={address} onChange={(e) => setAddress(e.target.value)} />
      <p className="mt-2 text-xs text-stone-500">
        Changes show on this customer’s bills. Existing invoice numbers stay the same.
      </p>
      {err && <p className={`${errBox} mt-3`}>{err}</p>}
      <div className="mt-4 flex gap-2">
        <button className={`${btn()} flex-1 sm:flex-none`} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        <button type="button" className={`${btn("ghost")} flex-1 sm:flex-none`} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
