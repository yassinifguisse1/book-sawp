# BookSwap Next.js

This is the Next.js App Router migration of the BookSwap prototype. The original
Vite app remains in the sibling `react-app` directory as a reference.

## Stack

- Next.js 16 App Router
- Clerk authentication
- tRPC with React Query
- Drizzle ORM with local MySQL or PlanetScale MySQL
- Tailwind CSS 4
- Upstash Redis and QStash, Vercel Blob, Algolia, Ably, Resend, and Sentry adapters

## Local Setup

1. Copy `.env.example` to `.env.local` and fill in the MySQL and Clerk values.
2. Create a new empty MySQL database for this app.
3. Push the schema and seed the prototype data:

```bash
npm run db:push
npm run db:seed
```

4. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Database Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
```

Use `db:push` only for local development. For deployed environments, generate
  and apply migrations with `db:generate` and `db:migrate`.

## Migration Notes

- Clerk users are lazily mirrored into the local `users` table while retaining
  numeric local IDs for existing relationships.
- External cover image URLs intentionally use standard `<img>` elements during
  the parity migration. Verified users can also upload listing covers directly
  to Vercel Blob.
- The active prototype screens were migrated. Unused Vite template components
  and OAuth modules were not copied.

## Production Operations

See [`docs/operations.md`](docs/operations.md) and
[`docs/launch-checklist.md`](docs/launch-checklist.md). The production database
uses `DATABASE_DRIVER=planetscale`; local development uses `mysql2`.
