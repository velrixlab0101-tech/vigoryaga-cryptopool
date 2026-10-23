import { createPublicClient, http } from 'viem'
import { bsc } from 'viem/chains'
import { PAYMENT_CHAIN_ID } from '@/lib/tokens'

const bscRpc =
  process.env.BSC_RPC_URL ||
  process.env.NEXT_PUBLIC_BSC_RPC_URL ||
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  'https://bsc-dataseed.binance.org'

/**
 * Read-only client used to verify on-chain deposits on BNB Smart Chain (BSC)
 * mainnet. The public RPC is intentionally generic; override via env for a
 * private endpoint in production.
 */
export const publicClient = createPublicClient({ chain: bsc, transport: http(bscRpc) })

export function clientForChain(chainId: number) {
  return chainId === PAYMENT_CHAIN_ID ? publicClient : null
}

export const SUPPORTED_CHAIN_IDS = [PAYMENT_CHAIN_ID] as const

export { bsc }
