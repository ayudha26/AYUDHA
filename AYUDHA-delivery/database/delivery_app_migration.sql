-- AYUDHA Delivery app support
-- Run this in Supabase SQL Editor after the main AYUDHA schema.

alter table orders add column if not exists assigned_delivery_user_id uuid references auth.users(id) on delete set null;
alter table orders add column if not exists picked_up_at timestamp with time zone;
alter table orders add column if not exists delivered_at timestamp with time zone;
alter table orders add column if not exists delivery_notes text;

create index if not exists orders_delivery_queue_idx
  on orders (status, assigned_delivery_user_id, delivery_date);

-- Mark the logged-in delivery partner as a driver by setting profiles.user_type = 'delivery'.
-- Example:
-- update profiles set user_type = 'delivery' where user_email = 'driver@example.com';

drop policy if exists "Delivery users can view delivery queue" on orders;
create policy "Delivery users can view delivery queue"
  on orders for select
  using (
    exists (
      select 1 from profiles
      where profiles.user_uuid = auth.uid()
      and profiles.user_type = 'delivery'
    )
    and status in ('confirmed', 'out_for_delivery', 'delivered')
    and (
      assigned_delivery_user_id is null
      or assigned_delivery_user_id = auth.uid()
    )
  );

drop policy if exists "Delivery users can update assigned orders" on orders;
create policy "Delivery users can update assigned orders"
  on orders for update
  using (
    exists (
      select 1 from profiles
      where profiles.user_uuid = auth.uid()
      and profiles.user_type = 'delivery'
    )
    and status in ('confirmed', 'out_for_delivery')
    and (
      assigned_delivery_user_id is null
      or assigned_delivery_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_uuid = auth.uid()
      and profiles.user_type = 'delivery'
    )
    and status in ('out_for_delivery', 'delivered')
    and assigned_delivery_user_id = auth.uid()
  );

drop policy if exists "Delivery users can view visible order items" on order_items;
create policy "Delivery users can view visible order items"
  on order_items for select
  using (
    exists (
      select 1
      from orders
      join profiles on profiles.user_uuid = auth.uid()
      where orders.id = order_items.order_id
      and profiles.user_type = 'delivery'
      and orders.status in ('confirmed', 'out_for_delivery', 'delivered')
      and (
        orders.assigned_delivery_user_id is null
        or orders.assigned_delivery_user_id = auth.uid()
      )
    )
  );
