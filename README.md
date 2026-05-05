# Bus Scheduler App

A static scheduling app for a bus driving company — runs entirely in the browser (no backend required). Schedules and drivers are stored in `localStorage` so data persists across page reloads.

## Live demo

Once GitHub Pages is enabled (see below), the app is available at:
`https://<your-github-username>.github.io/PT/`

## Features

- Add customer/company name
- Add an optional booking reference number
- Select vehicle type (Mini Bus, Coach, Double Decker, Accessible Bus, Van)
- Add pickup and drop-off locations
- Add pickup and drop-off dates/times (with validation: pickup must be before drop-off)
- **Driver management**: save named drivers and select them from a dropdown when creating a booking
- **Add Driver** inline form: enter a name and click Save — the driver is persisted and immediately available in the dropdown
- Track status: Scheduled, In Progress, Completed, Cancelled
- Search schedules
- Filter schedules by driver
- Delete schedules
- **Schedule views**: switch between **List**, **Calendar**, and **Drivers** views
  - **List view**: all bookings sorted by pickup date
  - **Calendar view**: monthly calendar with trip indicators per day
  - **Drivers view**: each saved driver displayed with their booked jobs
- Saves data in browser `localStorage` — no server needed

## How to use the app

1. Fill in the **New Schedule** form on the left:
   - Enter a customer or company name
   - Enter an optional booking reference number (e.g. `BRN-12345`)
   - Choose a vehicle type from the dropdown
   - Set the pickup date/time and return date/time
   - Enter pickup and drop-off locations
   - Choose a driver from the **Driver** dropdown, or click **Add Driver** to create and save a new one
   - Set the status and add optional notes
2. Click **Add Schedule** — the schedule appears in the list on the right.
3. Use the search box to filter schedules by any field.
4. Use the **driver filter** dropdown (appears once at least one driver is saved) to show only bookings for a specific driver.
5. Switch between **List**, **Calendar**, and **Drivers** views using the toggle buttons.
   - In **Drivers** view, each driver is listed with all their assigned bookings. Click a booking to see full details.
6. Click the **trash icon** on any schedule (or inside the trip detail modal) to delete it.
7. Click **Clear All** to remove all schedules.

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
- Add driver availability checks (prevent double-booking a driver)
- Export schedules to CSV/PDF
- Edit existing schedules inline
