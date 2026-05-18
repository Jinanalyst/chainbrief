create table if not exists cb_crypto_payments (
  id               uuid primary key default gen_random_uuid(),
  order_id         text not null unique,
  invoice_id       text not null,
  membership_type  text not null,
  currency         text not null,          -- "USDT" | "USDC"
  network          text not null,          -- "ERC20" | "TRC20" | "MATIC"
  amount_usd       numeric(10, 2) not null,
  status           text not null default 'pending',  -- pending | paid | expired | failed
  user_email       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Index for webhook lookups by order_id / invoice_id
create index if not exists cb_crypto_payments_order_id_idx    on cb_crypto_payments (order_id);
create index if not exists cb_crypto_payments_invoice_id_idx  on cb_crypto_payments (invoice_id);

-- RLS: only service role can read/write (payments are server-side only)
alter table cb_crypto_payments enable row level security;
