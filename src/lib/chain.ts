import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'

const baseRpc = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
const baseSepoliaRpc =
  process.env.BASE_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
  'https://sepolia.base.org'

/**
 * Read-only clients used to verify on-chain ticket purchases.
 * mainnet hosted RPC left intentionally generic; override via env for a
 * private endpoint in production.
 */
export const publicClient = createPublicClient({ chain: base, transport: http(baseRpc) })
export const publicClientSepolia = createPublicClient({ chain: baseSepolia, transport: http(baseSepoliaRpc) })

export function clientForChain(chainId: number) {
  if (chainId === baseSepolia.id) return publicClientSepolia
  if (chainId === base.id) return publicClient
  return null
}

export const SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id] as const

export { base, baseSepolia }
