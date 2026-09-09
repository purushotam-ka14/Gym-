# PulseForge Gym Website

## Important

This is a React + Vite website. Do not open `client/index.html` by double-clicking it. The site must be run through the development server or built first.

## Requirements

- Node.js 18 or newer
- npm or pnpm

## Run locally

From this project folder:

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal, usually:

```text
http://localhost:5173/
```

## Build and run production

```bash
npm install
npm run build
npm start
```

Then open:

```text
http://localhost:3000/
```

## Pages

- Public gym website: `/`
- Private admin dashboard demo: `/admin`
- Privacy policy route: `/privacy`

## Included functionality

- Public membership plans: 1 month, 6 months, 1 year
- QR check-in demo with scanning animation and success toast
- Member logout demo
- Separate admin dashboard with attendance, membership health, follow-up queue, and member records
- Responsive cinematic gym design

The admin panel is currently frontend-only. Connect it to the supplied backend/API before using it with real member records.
