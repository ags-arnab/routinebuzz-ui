# RoutineBuzz

**Live:** [routinebuzz.vercel.app](https://routinebuzz.vercel.app)

A university course schedule builder. Search courses, view sections, build a weekly routine, share it with a link, and export to calendar.

Built for BRAC University (BRACU) students, using [Connect](https://connect.bracu.ac.bd) course data.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, HeroUI v2, Tailwind CSS 4
- **State:** React Context + localStorage persistence, SWR for data fetching
- **Realtime:** Supabase Realtime for live shared routine updates
- **Other:** @dnd-kit for drag-and-drop, Framer Motion, iCalendar export

## Project Structure

```
src/
  components/       UI components (navbar, modals, theme switch)
  contexts/         React context providers (routine state)
  hooks/            Custom hooks (realtime subscriptions)
  config/           App configuration (site metadata, nav items)
  layouts/          Page layouts
  lib/              Frontend Supabase client
  pages/            Page components
  types/            Shared TypeScript types
  utils/            API helpers, calendar export logic
  styles/           Global CSS
```

## Getting Started

```bash
npm install
cp .env.example .env
```

Fill in your Supabase credentials in `.env`, then:

```bash
npm run dev
```

## Environment Variables

See `.env.example`:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Realtime subscriptions for shared routines |
| `VITE_SUPABASE_ANON_KEY` | Realtime subscriptions for shared routines |

The frontend works without Supabase — course data falls back to the CDN, and realtime/sharing features are disabled gracefully.

## API

This repo contains only the frontend. It expects a backend with these endpoints:

- `GET /api/courses` — list of courses
- `GET /api/course-data?courseCode=CSE101` — sections for a course
- `POST /api/routine/create` — create a shared routine
- `GET /api/routine/get?code=abc123` — fetch a shared routine
- `POST /api/routine/update` — update a shared routine

See `src/utils/api.ts` for all API calls and `src/types/index.ts` for request/response shapes.

## License

MIT
