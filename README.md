# CryptoPool

On-chain lucky-draw / raffle site. Players buy USDC tickets on **Base**; the
operator declares 5 winners with editable descending prizes plus an operator
fee. Tickets are recorded on-chain and verified server-side before they count.

- **Framework:** Next.js 16 (App Router, `proxy.ts` instead of middleware)
- **Chain:** Base / Base Sepolia, USDC (`6` decimals)
- **DB:** Postgres via Prisma 7 (Neon in production)
- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Contracts:** Hardhat 3 (`contracts/RaffleVault.sol`)

## Local development

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, admin wallet, vault address
npm run dev                 # http://localhost:3000
```

Local Node dev talks to any Postgres using `@prisma/adapter-pg` (e.g. local
Postgres). Production uses `@prisma/adapter-neon`; the adapter is selected at
runtime in `src/lib/prisma.ts`.

### Database

`prisma migrate dev` is disabled in Prisma 7 config mode, so migrations are
applied explicitly:

```bash
# create a new migration after editing prisma/schema.prisma
npx prisma migrate dev --create-only --name my_change

# apply + regenerate the client
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx prisma generate
```

### Admin access

Admin routes require a signature from the wallet in `NEXT_PUBLIC_ADMIN_WALLET`
(or `ADMIN_WALLET`). Locally you can also send the `x-admin-token` header with
the value of `ADMIN_DEV_TOKEN` (ignored in production).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | Next production build |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run contracts:compile` | Compile `RaffleVault` |
| `npm run contracts:deploy:sepolia` | Deploy to Base Sepolia |
| `npm run contracts:deploy:base` | Deploy to Base mainnet |
| `npm run cf:preview` | Build + preview on the Workers runtime |
| `npm run cf:deploy` | Build + deploy to Cloudflare |

## Contracts

`RaffleVault` holds USDC. `buyTickets` pulls USDC and emits `TicketSale`; the
server verifies that event before crediting tickets. `payoutBatch` (owner only)
pays up to 5 winners plus the operator fee in one transaction and emits
`Payout` / `OperatorPayout`.

```bash
PRIVATE_KEY=0x... npm run contracts:deploy:sepolia
# then set NEXT_PUBLIC_RAFFLE_VAULT to the printed address
```

## Deploying to Cloudflare + Neon

1. **Neon:** create a project and copy the pooled connection string
   (`...?sslmode=require`). Run migrations against it:
   `DATABASE_URL="postgresql://..." npx prisma migrate deploy`.
2. **Deploy the Worker:**
   ```bash
   npx wrangler login
   npm run cf:deploy
   ```
   `wrangler.jsonc` enables the `nodejs_compat` flag. `npm run cf:preview`
   runs the Worker locally first.
3. **Secrets / vars:** set runtime values on the Worker:
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put REFERRAL_PCT
   ```
   `NEXT_PUBLIC_*` values are inlined at build time — put them in `.env` (or
   `.dev.vars`) before `npm run cf:deploy`.
4. **Local Worker secrets:** copy `.dev.vars.example` to `.dev.vars`.

### Notes

- The Node `pg` driver is excluded from the Worker bundle via
  `outputFileTracingExcludes` in `next.config.ts`; only the Neon adapter runs
  on Cloudflare.
- `next build` logs non-fatal `indexedDB is not defined` warnings during
  prerender from wallet-connector code; the build still succeeds.
