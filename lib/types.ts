export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  created_at?: string;
};

export type Bill = {
  id: number;
  customer_id: number;
  bill_date: string;
  total: number;
  notes: string | null;
  invoice_no: string | null;
  previous_balance: number | null;
};

export type BillItem = {
  id: number;
  bill_id: number;
  item_name: string;
  qty: number;
  price: number;
  amount: number;
};

export type Payment = {
  id: number;
  customer_id: number;
  bill_id: number | null;
  amount: number;
  method: "cash" | "cheque" | "bank";
  status: "received" | "pending" | "returned";
  cheque_no: string | null;
  cheque_date: string | null;
  note: string | null;
  paid_at: string;
};

export type Balance = {
  billed: number;
  paid: number;
  pending: number;
  balance: number;
};
