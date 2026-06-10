create table public.outlet_inventory (
  outlet_inventory_id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  outlet_id character varying(50) not null,
  sales_rate_per_peg numeric(10, 2) not null default 0,
  sales_rate_per_bottle numeric(10, 2) not null default 0,
  product_status character varying(20) not null default 'ACTIVE'::character varying,
  peg_sale_allowed boolean not null default true,
  last_updated_by uuid null,
  last_updated_on timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint outlet_inventory_pkey primary key (outlet_inventory_id),
  constraint unique_product_outlet unique (product_id, outlet_id),
  constraint outlet_inventory_product_id_fkey foreign KEY (product_id) references products (product_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_outlet_inventory_product_id on public.outlet_inventory using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_outlet_inventory_outlet_id on public.outlet_inventory using btree (outlet_id) TABLESPACE pg_default;