# AYUDHA Delivery

Separate Expo app for delivery partners. It reads the existing AYUDHA `orders` and `order_items` tables from Supabase.

## Setup

1. Add the same Supabase env values used by the customer app:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Run `database/delivery_app_migration.sql` in the Supabase SQL Editor.

3. Mark delivery accounts in Supabase:

```sql
update profiles
set user_type = 'delivery'
where user_email = 'driver@example.com';
```

4. Install and run:

```bash
npm install
npm start
```

## Flow

- Customer app places an order with status `confirmed`.
- Delivery app shows confirmed orders to signed-in delivery users.
- Driver taps `START DELIVERY`; the order is assigned to that driver and status becomes `out_for_delivery`.
- Driver taps `MARK DELIVERED`; status becomes `delivered`.
