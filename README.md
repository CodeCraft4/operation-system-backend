# Operation System — Backend

NestJS 11 API for the AI Marketing & Sales platform. Express adapter, TypeScript, Prisma, Supabase, and Inngest are in the repo. Postgres is not connected in this scaffold.

## Setup

```bash
npm install
copy .env.example .env
npm run start:dev
```

API listens on [http://localhost:4000](http://localhost:4000). Next.js stays on port 3000.

## Health

- `GET /api/v1/health` → `{ "status": "ok" }`
- `GET /api/v1/health/ready` → app ready; `database`, `supabase`, and `inngest` are `skipped` until connected
- `GET /api/v1/jobs/inngest` → Inngest placeholder; no events are sent

## Environment

See `.env.example`. `DATABASE_URL`, Supabase, and Inngest keys are optional. The API boots without them.

## Scripts

```bash
npm run start:dev
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Next

Connect Supabase Postgres, run Prisma migrate, wire Auth/Storage, and register Inngest functions. Do not add provider adapters in this pass.
