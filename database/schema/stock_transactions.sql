create table public.stock_transactions (
  transaction_id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  from_stock_point_id character varying(50) null,
  to_stock_point_id character varying(50) null,
  outlet_id character varying(50) null,
  transaction_type character varying(20) not null,
  quantity_ml integer not null,
  reference_id character varying(100) null,
  notes text null,
  created_by uuid not null,
  created_on timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint stock_transactions_pkey primary key (transaction_id),
  constraint stock_transactions_product_id_fkey foreign KEY (product_id) references products (product_id) on delete CASCADE,
  constraint check_transaction_type check (
    (
      (transaction_type)::text = any (
        (
          array[
            'OPENING_STOCK'::character varying,
            'PURCHASE'::character varying,
            'STOCK_TRANSFER'::character varying,
            'CLOSING_STOCK'::character varying,
            'SALES'::character varying,
            'ADJUSTMENT'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_transactions_product_id on public.stock_transactions using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_from_stock on public.stock_transactions using btree (from_stock_point_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_to_stock on public.stock_transactions using btree (to_stock_point_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_outlet on public.stock_transactions using btree (outlet_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_date on public.stock_transactions using btree (created_on) TABLESPACE pg_default;

create index IF not exists idx_transactions_type on public.stock_transactions using btree (transaction_type) TABLESPACE pg_default;

create trigger stock_transfer_trigger
after INSERT on stock_transactions for EACH row
execute FUNCTION update_stock_inventory ();