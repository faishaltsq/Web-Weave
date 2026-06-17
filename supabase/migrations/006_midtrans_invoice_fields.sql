ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS midtrans_invoice_id text,
  ADD COLUMN IF NOT EXISTS midtrans_invoice_pdf_url text,
  ADD COLUMN IF NOT EXISTS midtrans_invoice_payment_link_url text;
