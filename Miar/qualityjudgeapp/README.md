# Mi'yar — Quality Judge

Mi'yar (مِعيار) is a full-stack evaluation and institutional-excellence
judging platform (React + Vite frontend, Express + tRPC backend, MySQL via
Drizzle ORM).

This build is fully self-hosted: it has no dependency on any third-party
platform. Authentication is email + password, AI judging goes through any
OpenAI-compatible provider, and uploaded evidence files are stored on the
local filesystem (or swap in your own storage provider — see
`server/storage.ts`).

## Requirements

- Node.js 20+
- A MySQL-compatible database (MySQL 8, PlanetScale, etc.)
- An OpenAI API key (or another OpenAI-compatible provider) for the AI
  judging/summarization features

## Setup

```bash
pnpm install          # or: npm install
cp .env.example .env  # fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, ...
pnpm db:push          # generate + run database migrations
pnpm dev               # start the dev server (Vite + Express, hot reload)
```

Generate a strong `JWT_SECRET` with:

```bash
openssl rand -hex 32
```

Set `OWNER_EMAIL` to the email address you plan to register with — that
account is automatically promoted to the `admin` role, giving you access to
the control center, user management, and criteria governance screens.

## Production build

```bash
pnpm build   # builds the client (Vite) and bundles the server (esbuild) into dist/
pnpm start   # NODE_ENV=production node dist/index.js
```

The server serves the built client, the tRPC API under `/api/trpc`, and
uploaded files under `/uploads`. Deploy it anywhere that runs a Node.js
process and can reach your MySQL database — a VPS, a container platform,
Railway, Render, Fly.io, etc. Point `DATABASE_URL` at a reachable MySQL
instance and make sure the process has a writable `uploads/` directory (or
attach a persistent volume / swap in cloud storage in `server/storage.ts`).

## Environment variables

See `.env.example` for the full list. The required ones are `DATABASE_URL`,
`JWT_SECRET`, and `OPENAI_API_KEY` (needed for AI judging/summarization
features — the rest of the app works without it).

## Notes on this build

This project was originally scaffolded on a third-party app-building
platform. It has since been decoupled from that platform's proprietary
services:

- **Authentication** — replaced OAuth-through-a-hosted-identity-provider
  with local email + password accounts (scrypt-hashed, JWT session
  cookies). See `server/_core/auth.ts`.
- **AI judging** — replaced the platform's internal LLM proxy with a direct
  call to any OpenAI-compatible `/chat/completions` endpoint. See
  `server/_core/llm.ts`.
- **File storage** — replaced the platform's S3 proxy with local-disk
  storage served over `/uploads`. See `server/storage.ts`.
- **Notifications** — the admin "notify owner" action now logs locally, or
  posts to `OWNER_NOTIFICATION_WEBHOOK_URL` if you set one.

Unused platform-specific modules (image generation, voice transcription,
scheduled "heartbeat" jobs, and a Google Maps proxy) were removed — none of
them were wired into any feature of the app.

The bundled user guide PDFs (`client/public/miyar_user_guide*.pdf`) still
describe the old sign-in flow; their Markdown sources
(`miyar_user_guide*.md`) have been updated to describe the new email +
password flow — regenerate the PDFs from those sources with your preferred
Markdown-to-PDF tool before distributing them.

## Institutional governance modules

A second round of work closed the codeable gaps identified against a
government/institutional awards-platform requirements audit: an
eligibility gate before nomination, a multi-stage approval workflow
(with eligibility + conflict-of-interest guardrails), an award
calendar, judging committees, conflict-of-interest declarations,
AI-recommendation-driven corrective-action tracking, versioned
reference data, a lightweight knowledge base for AI grounding, an
AI-output governance log, a SIEM-ready security event log, evidence
data-classification + a pluggable malware-scan hook, HTTP
security-hardening (helmet + rate limiting), and a versioned REST/OpenAPI
layer (`/api/v1`, spec at `openapi/v1.json`) alongside the primary tRPC
API for external system integration. A functional admin console for all
of this lives at `/governance` in the app.

See `docs/تقرير_تغطية_الفجوات.md` for the full gap-coverage report,
including the items that are explicitly out of scope for a codebase
(SIEM platform licensing, WAF/API gateway infrastructure, independent
penetration testing, real DR/RTO/RPO infrastructure, UAE Pass
integration, SLA contracts, physically separate environments, and real
ERP/HR/DMS/BI system integrations).

Ops scripts: `scripts/backup-db.sh` / `scripts/restore-db.sh` (MySQL
backup/restore), `scripts/load-test.mjs` (autocannon load-test
skeleton), and `.github/workflows/ci.yml` (typecheck + test + build +
dependency audit on every push/PR).
