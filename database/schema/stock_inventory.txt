create table public.stock_inventory (
  inventory_id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  stock_point_id character varying(50) not null,
  current_quantity_ml integer not null default 0,
  last_updated_by uuid null,
  last_updated_on timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint stock_inventory_pkey primary key (inventory_id),
  constraint unique_product_location unique (product_id, stock_point_id),
  constraint stock_inventory_product_id_fkey foreign KEY (product_id) references products (product_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_stock_inventory_product_id on public.stock_inventory using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_stock_inventory_stock_point on public.stock_inventory using btree (stock_point_id) TABLESPACE pg_default;