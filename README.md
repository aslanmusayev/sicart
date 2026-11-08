# SiCart

**YUNEX 2026 Hackathon prototype.** A smart shopping cart: no checkout queues, personal offers from purchase
data, in-store navigation, an AI voice assistant, and an accessibility mode for visually impaired shoppers.

> Status: work in progress. Sections below are filled in as the prototype is built.

---

## 1. Purpose

**The problem.** _To be written._

**The solution.** _To be written._

## 2. A short story (fictional)

_To be written._

## 3. Architecture

_Diagram to be added (mermaid)._

Planned stack: one Next.js codebase, Supabase (database and auth), Gemini (voice assistant), deployed on Vercel.

## 4. Data

_Data sources and data model to be described._

## 5. Run it

Requirements: Node 22+ and npm. Secrets live in `.env.local` and are **never committed**; `.env.example` lists
the variable names.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` / `npm run build` | Next.js dev server / production build |
| `npm test` | Unit tests (vitest): store data integrity, session reducer, recommendations |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run seed:gen` | Regenerate `supabase/seed.sql` from `lib/data/personas.ts` |
| `npm run seed:push` | Reset the demo data in the linked Supabase project |
| `npm run db -- db push --remote` | Apply new migrations from `supabase/migrations` |
| `npm run smoke:api` | End-to-end check of the session API and Realtime (needs `npm run dev -- -p 3100`) |
| `npm run images` | Generate product packshots (needs a Gemini key with billing enabled) |

Surfaces: `/` launcher, `/cart/12` cart screen, `/app` customer app, `/control` Demo Control (PIN = `DEMO_CONTROL_PIN`).

### Deploy (Vercel)

1. Import the GitHub repo in Vercel (framework preset: Next.js, no other settings needed).
2. Add these Environment Variables (Production and Preview), copied from `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`,
   `DEMO_CONTROL_PIN`, and `NEXT_PUBLIC_APP_URL`.
   `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_REF` are only for the CLI and are not needed on Vercel.
3. Deploy, then set `NEXT_PUBLIC_APP_URL` to the deployed `https://...vercel.app` URL (the cart QR code points
   there) and redeploy.
4. Open the URL on the devices: the phone's microphone and camera only work over HTTPS.

## 6. Team

| GitHub | Role |
|---|---|
| [@aslanmusayev](https://github.com/aslanmusayev) | _to be filled_ |
| [@RuslanQuliyev06](https://github.com/RuslanQuliyev06) | _to be filled_ |
| [@Sardar094](https://github.com/Sardar094) | _to be filled_ |

## 7. Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: branch from `main`, small commits, open a pull request,
and a teammate approves it before it is merged.

## License

MIT, see [LICENSE](LICENSE).
