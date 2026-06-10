create table public.users (
  user_id uuid not null default gen_random_uuid (),
  auth_id uuid null,
  name character varying(100) not null,
  email character varying(100) not null,
  stock_point character varying(100) null,
  role character varying(50) null,
  status character varying(20) null default 'active'::character varying,
  created_on timestamp without time zone null default CURRENT_TIMESTAMP,
  last_updated_on timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint users_pkey primary key (user_id),
  constraint users_auth_id_key unique (auth_id),
  constraint users_email_key unique (email),
  constraint users_auth_id_fkey foreign KEY (auth_id) references auth.users (id)
) TABLESPACE pg_default;