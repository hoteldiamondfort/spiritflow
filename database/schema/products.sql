create table public.products (
  product_id uuid not null default gen_random_uuid (),
  category_name character varying(50) not null,
  product_code character varying(50) null,
  product_name character varying(200) not null,
  product_alias character varying(100) not null,
  manufacturer_name character varying(100) null,
  ml_per_bottle integer not null,
  bottles_per_case integer not null,
  purchase_rate_per_ml numeric(10, 2) not null,
  product_description text null,
  product_status character varying(20) not null default 'active'::character varying,
  created_by uuid null,
  created_on timestamp without time zone null default CURRENT_TIMESTAMP,
  last_updated_by uuid null,
  last_updated_on timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint products_pkey primary key (product_id),
  constraint products_product_name_key unique (product_name)
) TABLESPACE pg_default;

create trigger initialize_product_inventory_trigger
after INSERT on products for EACH row
execute FUNCTION initialize_product_inventory ();

create trigger product_inventory_init_trigger
after INSERT on products for EACH row
execute FUNCTION initialize_product_inventory ();