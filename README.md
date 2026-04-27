# Bus Scheduler App

A static scheduling app for a bus driving company — runs entirely in the browser (no backend required). Schedules are stored in `localStorage` so data persists across page reloads.

## Live demo

Once GitHub Pages is enabled (see below), the app is available at:
`https://<your-github-username>.github.io/PT/`

## Features

- Add customer/company name
- Select vehicle type (Mini Bus, Coach, Double Decker, Accessible Bus, Van)
- Add pickup and drop-off locations
- Add pickup and drop-off dates/times (with validation: pickup must be before drop-off)
- Assign driver
- Track status: Scheduled, In Progress, Completed, Cancelled
- Search schedules
- Delete schedules
- Saves data in browser `localStorage` — no server needed

## How to use the app

1. Fill in the **New Schedule** form on the left:
   - Enter a customer or company name
   - Choose a vehicle type from the dropdown
   - Set the pickup date/time and drop-off date/time
   - Enter pickup and drop-off locations
   - Optionally add a driver name, status, and notes
2. Click **Add Schedule** — the schedule appears in the list on the right.
3. Use the search box to filter schedules.
4. Click the **trash icon** on any schedule to delete it.
5. Click **Clear All** to remove all schedules.

## Enable GitHub Pages ("Deploy from a branch")

The built site is in the `docs/` folder on the `main` branch. To serve it:

1. Go to your repository on GitHub.
2. Click **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment**, set:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/docs`
4. Click **Save**.
5. After a minute or two, GitHub Pages will publish the app. The URL will be shown at the top of the Pages settings page.

## Development

### Run locally

```bash
npm install
npm run dev
```

Open the local URL printed in your terminal.

### Build (regenerate the `docs/` folder)

```bash
npm run build
```

After building, commit and push the updated `docs/` folder so GitHub Pages picks up the new version.

## Next improvements

- Add login for office/admin users
- Add database such as Supabase, Firebase, PostgreSQL, or MongoDB
- Add calendar view
- Add vehicle availability checks
- Add driver availability checks
- Export schedules to CSV/PDF
