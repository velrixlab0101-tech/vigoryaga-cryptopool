export const DEFAULT_GAME_CONFIG: Record<string, { winPercent: number; houseEdge: number; enabled: boolean; minBet: number; maxBet: number }> = {
  slots: { winPercent: 45, houseEdge: 55, enabled: true, minBet: 1, maxBet: 100 },
  dice: { winPercent: 48, houseEdge: 52, enabled: true, minBet: 1, maxBet: 500 },
  plinko: { winPercent: 46, houseEdge: 54, enabled: true, minBet: 1, maxBet: 200 },
  mines: { winPercent: 47, houseEdge: 53, enabled: true, minBet: 1, maxBet: 200 },
  wheel: { winPercent: 45, houseEdge: 55, enabled: true, minBet: 1, maxBet: 200 },
  crash: { winPercent: 44, houseEdge: 56, enabled: true, minBet: 1, maxBet: 200 },
}
