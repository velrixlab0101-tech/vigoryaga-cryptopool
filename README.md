# CryptoPool

Lucky-draw / raffle site. Players buy tickets by sending **USDC or USDT** to the
operator's wallet on **BNB Smart Chain (BSC)**; the operator declares 5 winners with editable
descending prizes plus an operator fee, then pays each winner manually.

> **Custodial model.** Deposits go directly to the operator's address and funds
> are held there until the operator disburses prizes (or refunds a cancelled
> draw). There is no escrow contract.

- **Framework:** Next.js 16 (App Router, `proxy.ts` instead of middleware)
- **Chain:** BNB Smart Chain (BSC) mainnet, USDC + USDT (`18` decimals each)
- **DB:** Postgres via Prisma 7 (Neon in production)
- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare`

## How a draw works

1. Operator creates a draw and launches it.
2. A buyer selects USDC or USDT and sends exactly `ticket price × quantity` to
   the payment address (via their wallet or by scanning the QR). The app then
   records the tx hash.
3. The server verifies the ERC-20 `Transfer` to the payment address, derives
   the sender/token/amount from the receipt, and credits the tickets.
4. The operator closes the draw, declares the 5 winners, and pays each one
   manually from their wallet, recording each payout tx hash.
5. If a draw cannot run, the operator cancels it and records a refund tx hash
   per ticket.

## New-player protection (first-5-loss 50% credit-back)

Advertised on the landing page and applied automatically:

- For a player's **first 5 lost draws**, they are credited **50% of what they
  spent** on each of those draws. Winning a draw neither credits nor consumes a
  slot (winners earn nothing back and their protection simply ends).
- Credit is issued automatically the moment winners are declared, stored as an
  in-app balance (`UserCredit` + `CreditEntry`), and capped at 5 lost draws per
  wallet.
- Credit is **spendable on future tickets**, not withdrawable. On any open draw a
  connected player can choose **Apply credit** (wallet-signed, no on-chain
  transfer). Credit receipts are stored with a synthetic `credit:<id>` hash so no
  BscScan link is exposed.
- Balance and history are private: `GET /api/credits?wallet=` returns only that
  wallet's data.
- Core logic lives in `src/lib/credits.ts` (`computeCreditBacks`, `applyRedeem`,
  `PROTECTION_LIMIT`, `CREDIT_BACK_RATE`).

## Private creator revenue-share

An invite-only partner program that is invisible to normal users and has **no
on-chain traceability**.

- Operators add creators from **Admin → Creators** (`/admin/creators`): set the
  wallet, a custom share percentage (0–50), and an optional display name. No
  default rate exists — an unapproved or rate-less referral always earns 0%.
- Each creator gets a secret 256-bit dashboard link `/creator/<token>`
  (`GET /api/creator/<token>`). The dashboard shows referred players, volume,
  earned/paid/pending — **never** a wallet address or transaction hash.
- Creator shares accrue on referred ticket purchases (approved, non-self only),
  and payouts are recorded **off-chain** (amount + note, no tx hash) from the
  same admin page.
- Secrecy guarantees: the public `/api/referrals` route and `/referrals` page
  both return a uniform 404; unapproved wallets and bad tokens get the identical
  response; `/referrals` is removed from the navbar, footer and sitemap; and
  `/creator/*` responses are `no-store`.

## Local development

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, admin wallet, payment address
npm run dev                 # http://localhost:3000
```

Local Node dev talks to any Postgres using `@prisma/adapter-pg` (e.g. local
Postgres). Neon URLs and Cloudflare Workers use `@prisma/adapter-neon`; the
adapter is selected at runtime in `src/lib/prisma.ts`. This also means you can
run the app and the seed scripts locally against the production Neon database.

### Demo history data

To make a fresh deployment look established, seed deterministic demo draws,
tickets, winners and referrals spanning the last ~6 months:

```bash
npm run seed:history            # uses DATABASE_URL from .env
```

The script is idempotent — rows are prefixed `seed_draw_*` and recreated on
each run, so real draws are never touched. An `open` draw is only created when
none exists. Public APIs strip all wallet addresses, so synthetic winners are
indistinguishable from real ones on the site.

It also seeds 4 demo **creators** (with off-chain payouts and printable
`/creator/<token>` links) and a set of demo credit-back balances so the My
Tickets credit card has data.

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

### Payments

Set the address buyers pay (and that the server credits) on BNB Smart Chain
mainnet. Both USDC and USDT are sent to the same address:

```bash
NEXT_PUBLIC_PAYMENT_ADDRESS=0x7396727C1edd2024Acc8Ee0cBE327535C179B464  # shown to buyers (address + QR)
PAYMENT_ADDRESSES=0x7396727C1edd2024Acc8Ee0cBE327535C179B464            # server allow-list, comma-separated
```

`PAYMENT_ADDRESSES` falls back to `NEXT_PUBLIC_PAYMENT_ADDRESS`, then to the
built-in default address in `src/lib/tokens.ts`. Deposit verification reads the
transaction receipt from `BSC_RPC_URL` (defaults to the public BSC RPC) and only
credits `Transfer` logs sent to one of those addresses. Both USDC and USDT are
treated 1:1 with USD.

> BSC USDC (`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`) and USDT
> (`0x55d398326f99059fF775485246999027B3197955`) both use **18 decimals** — do
> not reuse Base's 6-decimal defaults.

> Keep a small amount of BNB in the payment wallet: sending USDC/USDT from it
> requires BNB on BSC for gas.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | Next production build |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run seed:history` | Seed deterministic demo draws/winners |
| `npm run cf:preview` | Build + preview on the Workers runtime |
| `npm run cf:deploy` | Build + deploy to Cloudflare |

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
   npx wrangler secret put PAYMENT_ADDRESSES
   npx wrangler secret put REFERRAL_PCT
   ```
   `NEXT_PUBLIC_*` values are inlined at build time — put them in `.env` (or
   `.dev.vars`) before `npm run cf:deploy`. This includes
   `NEXT_PUBLIC_PAYMENT_ADDRESS` and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
4. **Local Worker secrets:** copy `.dev.vars.example` to `.dev.vars`.

### Notes

- The Node `pg` driver is excluded from the Worker bundle via
  `outputFileTracingExcludes` in `next.config.ts`; only the Neon adapter runs
  on Cloudflare.
- `next build` logs non-fatal `indexedDB is not defined` warnings during
  prerender from wallet-connector code; the build still succeeds.

## Compliance

This is a custodial money-transmission–adjacent product. Before operating:

- Confirm lotteries/raffles are legal where you and your players are located
  and check whether you need a gambling/betting license.
- KYC/AML obligations may apply once you hold customer funds; consult counsel.
- Keep records of every deposit, payout and refund (all tx hashes are stored).
- Publish clear terms: ticket price, odds/prize structure, draw timing and the
  refund/cancellation policy.
