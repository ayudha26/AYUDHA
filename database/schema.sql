-- Construction Materials Delivery App Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_uuid uuid references auth.users(id) on delete cascade not null unique,
  user_email text not null,
  full_name text,
  company_name text,
  phone text,
  avatar_url text,
  user_type text default 'customer',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists avatar_url text;

-- Categories table
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  icon_url text,
  created_at timestamp with time zone default now()
);

-- Products table
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price decimal(10, 2) not null,
  unit text not null,
  catalog_key text,
  brand text,
  material text,
  category_id uuid references categories(id) on delete set null,
  image_url text,
  stock integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Backfill-safe columns for existing projects
alter table products add column if not exists catalog_key text;
alter table products add column if not exists brand text;
alter table products add column if not exists material text;
drop index if exists products_catalog_key_unique;
create unique index if not exists products_catalog_key_unique
  on products (catalog_key);

-- Product variants table for sizes/pack options
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

-- Cart items table
create table if not exists cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  quantity integer not null default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, product_id)
);

-- Wishlist items table
create table if not exists wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, product_id)
);

-- Addresses table
create table if not exists addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  street text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  phone text not null,
  is_default boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Orders table
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status text check (status in ('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')) default 'pending',
  total decimal(10, 2) not null,
  delivery_address text not null,
  delivery_date timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Order items table
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  quantity integer not null,
  price_at_purchase decimal(10, 2) not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table cart_items enable row level security;
alter table wishlist_items enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- RLS Policies for profiles
drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = user_uuid);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = user_uuid);

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = user_uuid);

-- RLS Policies for categories (public read)
drop policy if exists "Anyone can view categories" on categories;
create policy "Anyone can view categories"
  on categories for select
  to anon, authenticated
  using (true);

-- RLS Policies for products (public read)
drop policy if exists "Anyone can view products" on products;
create policy "Anyone can view products"
  on products for select
  to anon, authenticated
  using (true);

-- RLS Policies for product_variants (public read)
drop policy if exists "Anyone can view product variants" on product_variants;
create policy "Anyone can view product variants"
  on product_variants for select
  to anon, authenticated
  using (true);

-- RLS Policies for cart_items
drop policy if exists "Users can view their own cart items" on cart_items;
create policy "Users can view their own cart items"
  on cart_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own cart items" on cart_items;
create policy "Users can insert their own cart items"
  on cart_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own cart items" on cart_items;
create policy "Users can update their own cart items"
  on cart_items for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own cart items" on cart_items;
create policy "Users can delete their own cart items"
  on cart_items for delete
  using (auth.uid() = user_id);

-- RLS Policies for wishlist_items
drop policy if exists "Users can view their own wishlist items" on wishlist_items;
create policy "Users can view their own wishlist items"
  on wishlist_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own wishlist items" on wishlist_items;
create policy "Users can insert their own wishlist items"
  on wishlist_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own wishlist items" on wishlist_items;
create policy "Users can delete their own wishlist items"
  on wishlist_items for delete
  using (auth.uid() = user_id);

-- RLS Policies for addresses
drop policy if exists "Users can view their own addresses" on addresses;
create policy "Users can view their own addresses"
  on addresses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own addresses" on addresses;
create policy "Users can insert their own addresses"
  on addresses for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own addresses" on addresses;
create policy "Users can update their own addresses"
  on addresses for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own addresses" on addresses;
create policy "Users can delete their own addresses"
  on addresses for delete
  using (auth.uid() = user_id);

-- RLS Policies for orders
drop policy if exists "Users can view their own orders" on orders;
create policy "Users can view their own orders"
  on orders for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own orders" on orders;
create policy "Users can insert their own orders"
  on orders for insert
  with check (auth.uid() = user_id);

-- RLS Policies for order_items
drop policy if exists "Users can view their own order items" on order_items;
create policy "Users can view their own order items"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert their own order items" on order_items;
create policy "Users can insert their own order items"
  on order_items for insert
  with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- Insert sample categories for construction materials
insert into categories (name, description, icon_url) values
  ('Cement & Concrete', 'Cement, concrete mix, and related materials', 'https://example.com/cement-icon.png'),
  ('Steel & Metal', 'Steel bars, rods, sheets, and metal products', 'https://example.com/steel-icon.png'),
  ('Bricks & Blocks', 'Clay bricks, concrete blocks, and masonry', 'https://example.com/bricks-icon.png'),
  ('Sand & Aggregates', 'Sand, gravel, crushed stone, and aggregates', 'https://example.com/sand-icon.png'),
  ('Tools & Equipment', 'Hand tools, power tools, and construction equipment', 'https://example.com/tools-icon.png'),
  ('Paint & Finishing', 'Paints, primers, putty, and finishing materials', 'https://example.com/paint-icon.png'),
  ('Plumbing', 'Pipes, fittings, fixtures, and plumbing supplies', 'https://example.com/plumbing-icon.png'),
  ('Electrical', 'Wires, switches, panels, and electrical supplies', 'https://example.com/electrical-icon.png'),
  ('Wood & Timber', 'Lumber, plywood, and wood products', 'https://example.com/wood-icon.png'),
  ('Hardware', 'Nails, screws, bolts, and general hardware', 'https://example.com/hardware-icon.png')
on conflict do nothing;

-- Insert sample products
insert into products (name, description, price, unit, category_id, image_url, stock)
select
  'OPC Cement 50kg', 'Ordinary Portland Cement, 50kg bag, Grade 53', 450.00, 'bag', c.id, 'https://example.com/cement-50kg.png', 500
from categories c where c.name = 'Cement & Concrete'
limit 1
on conflict do nothing;

insert into products (name, description, price, unit, category_id, image_url, stock)
select
  'TMT Steel Bars 10mm', 'Thermo Mechanically Treated steel bars, 10mm diameter', 65.00, 'kg', c.id, 'https://example.com/steel-10mm.png', 2000
from categories c where c.name = 'Steel & Metal'
limit 1
on conflict do nothing;

insert into products (name, description, price, unit, category_id, image_url, stock)
select
  'Red Bricks (per piece)', 'Standard size red clay bricks for construction', 12.00, 'piece', c.id, 'https://example.com/red-brick.png', 10000
from categories c where c.name = 'Bricks & Blocks'
limit 1
on conflict do nothing;

insert into products (name, description, price, unit, category_id, image_url, stock)
select
  'River Sand', 'High quality river sand for construction, per cubic feet', 85.00, 'cft', c.id, 'https://example.com/river-sand.png', 300
from categories c where c.name = 'Sand & Aggregates'
limit 1
on conflict do nothing;

insert into products (name, description, price, unit, category_id, image_url, stock)
select
  'Hammer Claw Type', 'Standard claw hammer for construction work', 350.00, 'piece', c.id, 'https://example.com/hammer.png', 150
from categories c where c.name = 'Tools & Equipment'
limit 1
on conflict do nothing;
