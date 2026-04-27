# Bus Scheduler App

A simple React/Vite scheduling app for a bus driving company.

## Features

- Add customer/company name
- Select vehicle type
- Add pickup and drop-off locations
- Add pickup and drop-off dates/times
- Assign driver
- Track status: Scheduled, In Progress, Completed, Cancelled
- Search schedules
- Delete schedules
- Saves data in browser `localStorage`

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed in your terminal.

## Build

```bash
npm run build
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial bus scheduler app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bus-scheduler-app.git
git push -u origin main
```

## Next improvements

- Add login for office/admin users
- Add database such as Supabase, Firebase, PostgreSQL, or MongoDB
- Add calendar view
- Add vehicle availability checks
- Add driver availability checks
- Export schedules to CSV/PDF
