# Priority Transfers — Vehicle Scheduling App (cloud edition)

A React/Vite app for scheduling vehicle bookings. This version stores data
in **Supabase** instead of `localStorage`, so the same account can be used
from any device (mobile, tablet, desktop) and data stays in sync.

- **Auth:** email + password, Google sign-in, Apple sign-in
- **Per-user data:** Postgres tables with row-level security
- **Offline-friendly:** writes are queued locally and synced when online
- **Realtime:** changes on one device show up on the others immediately

## 1. Create a Supabase project

1. Go to <https://supabase.com> and create a new project. Pick any region;
   the free tier is plenty for this app.
2. Once it's provisioned, open **Project Settings → API** and copy:
   - `Project URL`
   - `anon` `public` key

## 2. Run the database migration

Open **SQL Editor** in the Supabase dashboard and run the SQL files in
[`supabase/migrations/`](supabase/migrations/) order:

1. [`0001_init.sql`](supabase/migrations/0001_init.sql)
2. [`0002_return_trip_fields.sql`](supabase/migrations/0002_return_trip_fields.sql)

This creates the per-user tables (`trips`, `drivers`, `vehicles`), enables
Realtime broadcasts, and adds the optional return-trip fields used by the
schedule form.

If you use the Supabase CLI instead, the file is already in the
conventional location:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

## 3. Enable the auth providers you want

In Supabase: **Authentication → Providers**.

- **Email** — on by default. If you want users to skip the email
  confirmation step while testing, turn off *Confirm email* in
  **Authentication → Settings**.
- **Google** — toggle on, paste a Google OAuth Client ID + Secret.
  Create one at
  <https://console.cloud.google.com/apis/credentials>. Use the redirect
  URL Supabase shows on that screen (it looks like
  `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`).
- **Apple** — toggle on, paste your Apple Services ID, Team ID, Key ID
  and the `.p8` private key. Generate these in your Apple Developer
  account under *Certificates, Identifiers & Profiles*.

In **Authentication → URL Configuration**, add the URLs the app runs on
(both local dev and your deployed URL, e.g. `http://localhost:5173` and
`https://aloc23.github.io/PT/`) to **Site URL** and **Redirect URLs**.

## 4. Add your keys to the app

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

The `.env` file is gitignored — never commit it.

## 5. Run the app

```bash
npm install
npm run dev
```

Open <http://localhost:5173>, create an account, and start adding trips.
Sign in on another device with the same email/Google/Apple account and
your data will be there.

## 6. Deploy

Same as before — `npm run build` outputs to `docs/` and `npm run deploy`
still pushes to GitHub Pages. Just make sure:

- The deployed URL is in Supabase's **Redirect URLs** list.
- The same `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are available at
  build time (either in `.env`, or in your hosting provider's env vars).
  Vite bakes them into the bundle at build time, so a fresh `npm run
  build` is needed after changing them.

## How the cloud sync works

- Each table is filtered by `auth.uid() = user_id` via row-level security,
  so a user can only ever read/write their own rows.
- The React app uses a small `useCloudCollection` hook
  (`src/data/useCloudCollection.js`) that:
  - Hydrates state instantly from a localStorage cache so the UI is fast
    on reload and works offline.
  - Fetches the latest rows from Supabase in the background and replaces
    the cache.
  - Subscribes to Postgres `Realtime` changes so updates from another
    device appear without a refresh.
  - Persists writes to Supabase optimistically; if a write fails (offline
    or transient error), it's queued in localStorage and retried when the
    browser goes back online.
- The first time you sign in on a device that has data from the old
  offline version, the app offers a one-click **Import** to push it into
  your account.

## Project layout

```
src/
  main.jsx                  App shell + Root that gates on auth
  styles.css                All styling, including new auth & sync UI
  supabaseClient.js         Shared Supabase client
  auth/
    AuthGate.jsx            Sign-in / sign-up screen
    useAuth.js              Session subscription hook
  data/
    mappers.js              camelCase <-> snake_case mapping
    useCloudCollection.js   Offline-first sync hook used by App
supabase/
  migrations/0001_init.sql  Schema + RLS policies
```

## Features (unchanged from offline version)

- Add customer / company name and optional booking reference
- Pick vehicle type and manage the vehicle list (add / rename / delete)
- Outbound pickup/drop-off timing plus an optional return-trip section
- Pickup and drop-off locations
- Driver management (add / rename / delete; renames propagate to existing
  trips)
- Status tracking (Scheduled, In Progress, Completed, Cancelled)
- Search, filter by driver
- Three views: **List**, **Calendar**, **Drivers**
- Vehicle availability check — warns if the selected vehicle type is
  already booked for the chosen window
- Clear All

## Troubleshooting

- **"Almost there" screen.** Your `.env` is missing or wasn't loaded —
  restart `npm run dev` after editing it. Vite only reads `.env` at start.
- **Google/Apple button returns an error.** That provider isn't enabled
  in Supabase yet, or its redirect URL isn't in the allow-list. See step
  3.
- **Data doesn't appear on a second device.** Make sure you signed in
  with the same account (not a different OAuth identity). Each Supabase
  user is a distinct `auth.uid()`, and RLS scopes data by user.

## Next improvements

- Driver availability checks (prevent double-booking a driver too)
- Edit existing trips inline
- Export schedules to CSV / PDF
- Native mobile shell (PWA install / Capacitor) on top of this same
  cloud backend
