# Hackathon Registration & Judging Panel

- `/` – team registration (team name, member 1 + email, member 2 + email, project area). Shows the allocated table instantly.
- `/judges.html` – judges dashboard: all teams, per-panel tabs (Panel 1-4), search, CSV export, print, live table map.

## Rules implemented
- 100 tables; each is given to exactly one team (random, never reused) – done atomically in Redis.
- Each new team goes to the panel with the fewest teams, so the 4 panels always differ by at most 1 team.
- Duplicate team names / emails are rejected.
- Registration closes automatically when all 100 tables are used.

## Deploy on Vercel
1. Push this folder to a GitHub repo (or run `npx vercel` inside it).
2. In Vercel: **Import Project** -> select the repo -> Deploy.
3. In the project: **Storage / Marketplace -> Upstash Redis -> Create & connect** to the project (this adds the `KV_REST_API_URL` / `KV_REST_API_TOKEN` env vars).
4. **Settings -> Environment Variables**: add `JUDGE_PASSCODE` (e.g. `judge2026`) to protect the dashboard.
5. **Redeploy**. Share the main URL with participants and `/judges.html` + passcode with judges.
