create table public.day_master (
  date date not null,
  day_status character varying(20) not null default 'OPEN'::character varying,
  total_liquor_sale_volume integer null default 0,
  total_liquor_sale_amount numeric(15, 2) null default 0.00,
  closed_by uuid null,
  closed_on timestamp without time zone null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint day_master_pkey primary key (date),
  constraint check_day_status check (
    (
      (day_status)::text = any (
        (
          array[
            'OPEN'::character varying,
            'CLOSED'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint check_liquor_sale_amount check ((total_liquor_sale_amount >= 0.00)),
  constraint check_liquor_sale_volume check ((total_liquor_sale_volume >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_day_master_status on public.day_master using btree (day_status) TABLESPACE pg_default;

create index IF not exists idx_day_master_date_status on public.day_master using btree (date, day_status) TABLESPACE pg_default;

create trigger auto_open_next_day_trigger
after
update on day_master for EACH row when (
  old.day_status::text = 'OPEN'::text
  and new.day_status::text = 'CLOSED'::text
)
execute FUNCTION auto_open_next_day ();