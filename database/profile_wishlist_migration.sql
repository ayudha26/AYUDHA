alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists avatar_url text;

create table if not exists wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, product_id)
);

alter table wishlist_items enable row level security;

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
