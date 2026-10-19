import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const isCloudflareWorker =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

async function createClient() {
  const connectionString = process.env.DATABASE_URL

  if (isCloudflareWorker) {
    const { PrismaNeon } = await import('@prisma/adapter-neon')
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
  }

  // Computed specifier so the Node-only `pg` driver (and its `pg-cloudflare`
  // optional dependency) is never bundled into the Cloudflare Workers build.
  const pgAdapter = '@prisma/adapter-' + 'pg'
  const { PrismaPg } = (await import(pgAdapter)) as typeof import('@prisma/adapter-pg')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const prisma = globalForPrisma.prisma ?? (await createClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
