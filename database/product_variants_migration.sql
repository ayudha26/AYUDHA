-- Apply this migration in Supabase SQL Editor for existing projects.

alter table products add column if not exists catalog_key text;
alter table products add column if not exists brand text;
alter table products add column if not exists material text;
drop index if exists products_catalog_key_unique;
create unique index if not exists products_catalog_key_unique
  on products (catalog_key);

create table if not exists product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade not null,
  size_label text not null,
  unit text,
  price decimal(10, 2),
  stock integer not null default 0,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists product_variants_product_size_unique
  on product_variants (product_id, size_label);

alter table product_variants enable row level security;

drop policy if exists "Anyone can view product variants" on product_variants;
create policy "Anyone can view product variants"
  on product_variants for select
  to anon, authenticated
  using (true);
