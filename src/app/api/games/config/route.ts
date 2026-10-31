import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_GAME_CONFIG } from '@/lib/game-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await prisma.gameSetting.findMany()
    const config: Record<string, any> = { ...DEFAULT_GAME_CONFIG }
    for (const s of settings) {
      config[s.gameSlug] = {
        winPercent: s.winPercent,
        houseEdge: s.houseEdge,
        enabled: s.enabled,
        minBet: s.minBet,
        maxBet: s.maxBet,
      }
    }
    return NextResponse.json({ config })
  } catch {
    return NextResponse.json({ config: DEFAULT_GAME_CONFIG })
  }
}
