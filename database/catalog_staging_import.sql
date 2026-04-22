-- Option 2: Supabase catalog import with read-only app access.
-- Run this in Supabase SQL Editor after loading staging CSVs.

-- 1) Enforce read-only permissions for app roles on catalog tables.
revoke insert, update, delete on table categories from anon, authenticated;
revoke insert, update, delete on table products from anon, authenticated;
revoke insert, update, delete on table product_variants from anon, authenticated;

-- 2) Staging tables for CSV import from imports/output/*.csv.
create table if not exists catalog_products_staging (
  product_external_key text primary key,
  name text not null,
  description text,
  brand text,
  material text,
  unit text,
  image_url text,
  category_name text not null
);

create table if not exists catalog_variants_staging (
  product_external_key text not null,
  size_label text not null,
  unit text,
  price text,
  stock text,
  image_url text
);

-- Backfill-safe type adjustments for older staging tables.
alter table if exists catalog_variants_staging
  alter column price type text using nullif(trim(price::text), '');

alter table if exists catalog_variants_staging
  alter column stock type text using nullif(trim(stock::text), '');

-- 2b) Ensure upsert conflict targets exist.
drop index if exists products_catalog_key_unique;
create unique index if not exists products_catalog_key_unique
  on products (catalog_key);

create unique index if not exists product_variants_product_size_unique
  on product_variants (product_id, size_label);

-- 3) Import CSV files into staging tables using Supabase Table Editor.
-- products.csv -> catalog_products_staging
-- product_variants.csv -> catalog_variants_staging

-- 4) Merge staging data into categories/products/product_variants.
insert into categories (name, description)
select distinct trim(s.category_name), 'Imported catalog category'
from catalog_products_staging s
where trim(coalesce(s.category_name, '')) <> ''
  and not exists (
    select 1
    from categories c
    where lower(c.name) = lower(trim(s.category_name))
  );

with category_map as (
  select distinct on (lower(name))
    lower(name) as normalized_name,
    id as category_id
  from categories
  order by lower(name), created_at asc, id asc
)
insert into products (
  catalog_key,
  name,
  description,
  price,
  unit,
  brand,
  material,
  category_id,
  image_url,
  stock,
  updated_at
)
select
  trim(s.product_external_key),
  trim(s.name),
  nullif(trim(s.description), ''),
  0,
  coalesce(nullif(trim(s.unit), ''), 'unit'),
  nullif(trim(s.brand), ''),
  nullif(trim(s.material), ''),
  cm.category_id,
  nullif(trim(s.image_url), ''),
  0,
  now()
from catalog_products_staging s
join category_map cm
  on cm.normalized_name = lower(trim(s.category_name))
where trim(coalesce(s.product_external_key, '')) <> ''
  and trim(coalesce(s.name, '')) <> ''
on conflict (catalog_key)
do update set
  name = excluded.name,
  description = excluded.description,
  unit = excluded.unit,
  brand = excluded.brand,
  material = excluded.material,
  category_id = excluded.category_id,
  image_url = excluded.image_url,
  updated_at = now();

insert into product_variants (
  product_id,
  size_label,
  unit,
  price,
  stock,
  image_url,
  updated_at
)
select
  p.id,
  trim(v.size_label),
  coalesce(nullif(trim(v.unit), ''), trim(v.size_label)),
  nullif(trim(v.price), '')::decimal(10, 2),
  coalesce(nullif(trim(v.stock), '')::integer, 0),
  nullif(trim(v.image_url), ''),
  now()
from catalog_variants_staging v
join products p
  on p.catalog_key = trim(v.product_external_key)
where trim(coalesce(v.size_label, '')) <> ''
on conflict (product_id, size_label)
do update set
  unit = excluded.unit,
  price = excluded.price,
  stock = excluded.stock,
  image_url = excluded.image_url,
  updated_at = now();

-- 5) Optional cleanup after successful import.
-- truncate table catalog_products_staging;
-- truncate table catalog_variants_staging;
