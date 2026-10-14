# BharatTube Team Portal

Private internal portal: tasks, attendance, weekly reports, announcements, team. React + TypeScript + Tailwind, Supabase (auth + database), Vercel hosting.

## Setup
1. Create a Supabase project. Run `supabase/migrations/001_schema.sql` in SQL Editor.
2. Copy `.env.example` to `.env` and fill the Project URL and anon key (Supabase > Project Settings > API).
3. `npm install && npm run dev`
4. Sign up once in the app, then run `002_make_first_admin.sql` (with your email) to become Admin.
5. Supabase > Authentication > URL Configuration: add your Vercel URL as Site URL and `<url>/reset` as a redirect.
6. Vercel: import this repo, add the two env vars, deploy.

## Security
New signups are Members and not approved. Only an approved user can read data; Admins approve people. Row Level Security is enforced in the database. Never put the service-role key in the frontend.
