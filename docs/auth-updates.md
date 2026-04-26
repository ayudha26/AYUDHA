# Authentication & Data Persistence Updates

This document explains the recent changes made to authentication flows, profile persistence, and order/cart saving, plus steps to configure Supabase SMS/email providers and DB migration notes.

## Summary of code changes

- Sign up/sign in:
  - `SignUpScreen` now supports two exclusive methods: `Email` or `Phone` (toggle). Only the selected method's fields are shown.
  - `SignInScreen` now supports two exclusive methods: `Email` (email + password) or `Phone` (phone-only OTP).
  - For phone flows, Supabase SMS OTP is used (`signInWithOtp`) and verification is handled in `VerificationScreen` using `verifyOtp({ phone, token, type: 'sms' })`.
  - For email flows, we switched to Supabase's built-in confirmation/magic link flow (`signUp`), which sends a confirmation link to the user's email. The app alerts users to check email and then sign in.

- Profile persistence:
  - `VerificationScreen` upserts the `profiles` row on successful phone OTP verification.
  - `ProfileScreen` now inserts a `profiles` row if none exists when a user signs in (ensures user details are saved to DB).

- Cart & Orders:
  - `CartContext` stores guest carts in AsyncStorage and saves cart items to the `cart_items` table for authenticated users.
  - `CartScreen` creates `orders` and `order_items` rows on checkout. These are persisted to the DB for authenticated users.

- Types & schema:
  - Relaxed `user_type` constraints in TypeScript and DB. Database schema updated: `user_type text default 'customer'` (removed `b2b`/`b2c` check constraint).

## Supabase SMS (OTP) setup

1. Sign in to your Supabase project dashboard.
2. Go to `Authentication` -> `Settings` -> `SMS` (or `SMS providers`) and configure a provider (Twilio is common).
   - For Twilio you will need `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and a `TWILIO_PHONE_NUMBER`.
3. After configuring SMS provider, test sending an OTP using the Supabase dashboard or SDK: `supabase.auth.signInWithOtp({ phone: '+91..' })`.
4. Make sure you allow/whitelist any necessary numbers in Twilio (if sandboxing).

Environment variables (Expo / .env):
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- (Optional) TWILIO_* keys — these are configured inside Supabase, not in the mobile app.

Note: Supabase handles SMS sending — your Supabase project must have an SMS provider configured.

## Email verification change

- We removed the Resend-based numeric-code approach for email verification and now use Supabase's confirmation/magic link flow.
- On sign up with `email + password`, Supabase sends a confirmation email. User must confirm via the link before signing in.
- If you prefer numeric email OTPs, keep using the `Resend` service or a custom transactional email provider.

## DB migration notes

If you already ran the original `schema.sql`, update the `profiles` table to remove the check constraint allowing free-form `user_type` values.

Example migration SQL (run in Supabase SQL editor):

-- Option A: alter column to drop check by recreating column
BEGIN;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles ALTER COLUMN user_type SET DEFAULT 'customer';
COMMIT;

If the constraint has a different name, find it in `pg_catalog.pg_constraint` and drop by name.

## Ensuring profile rows exist

- The app now creates a `profiles` row automatically when a user signs in and no profile exists. This ensures `full_name`, `phone`, and `avatar_url` are persisted where possible.

## Cart & Orders persistence

- Cart items are saved to `cart_items` for authenticated users and reloaded from DB on auth state change.
- On checkout, an `orders` row is created and `order_items` are inserted. If insertion of `order_items` fails, the order row is deleted to avoid orphan orders.

## Next recommended actions

- Verify Supabase SMS provider (Twilio) configuration and test an OTP flow.
- Run the updated `database/schema.sql` in Supabase SQL editor (or apply the migration snippet above).
- Optionally add an email-sent confirmation screen to guide users after email sign-up (we currently show an alert and send them back to Sign In).

If you want, I can:
- Add a small `CheckEmailScreen` that replaces the simple alert and provides a resend link button (using Supabase's resend or a custom email provider).
- Add end-to-end tests for sign-up/sign-in flows (unit + integration mocks).

---
Changes implemented in code: SignUpScreen, SignInScreen, VerificationScreen, ProfileScreen, database/schema.sql

File references:
- `src/Screens/SignUpScreen.tsx`
- `src/Screens/SignInScreen.tsx`
- `src/Screens/VerificationScreen.tsx`
- `src/Screens/Profile/ProfileScreen.tsx`
- `src/Context/CartContext.tsx`
- `src/Screens/Cart/CartScreen.tsx`
- `database/schema.sql`

If you'd like, I can now:
- Create a small UI to choose sign-up method more visually (icons, extra help text),
- Add a `CheckEmailScreen` with a resend action, or
- Run quick smoke tests (if you want me to run the app or simulate flows).

Tell me which of these you'd like next.