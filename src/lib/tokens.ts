/**
 * Payment tokens for the custodial model.
 *
 * Buyers send USDC or USDT directly to the operator's payment address on BNB
 * Smart Chain (BSC) mainnet. The server verifies the ERC-20 `Transfer` receipt
 * before crediting tickets, so the client can never forge a quantity.
 */
export type TokenSymbol = 'USDC' | 'USDT'

export interface TokenConfig {
  symbol: TokenSymbol
  name: string
  address: `0x${string}`
  decimals: number
}

/** BNB Smart Chain (BSC) mainnet — the only supported payment chain. */
export const PAYMENT_CHAIN_ID = 56

export const TOKENS: Record<TokenSymbol, TokenConfig> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    decimals: 18,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
  },
}

export const TOKEN_SYMBOLS: readonly TokenSymbol[] = ['USDC', 'USDT']

export function isTokenSymbol(value: unknown): value is TokenSymbol {
  return value === 'USDC' || value === 'USDT'
}

/** Resolves a symbol to its config, or null when unknown. */
export function getToken(symbol: string): TokenConfig | null {
  return isTokenSymbol(symbol) ? TOKENS[symbol] : null
}

/** Resolves a token by contract address (case-insensitive), or null. */
export function tokenByAddress(address: string): TokenConfig | null {
  const lower = address.toLowerCase()
  return TOKEN_SYMBOLS.map((s) => TOKENS[s]).find((t) => t.address.toLowerCase() === lower) ?? null
}

/** Minimal ERC-20 ABI: transfer, balanceOf and the Transfer event. */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const

/** Dollars -> token base units. */
export function toTokenUnits(amount: number, decimals = 6): bigint {
  return BigInt(Math.round(amount * 10 ** decimals))
}

/** Token base units -> dollars. */
export function fromTokenUnits(units: bigint, decimals = 6): number {
  return Number(units) / 10 ** decimals
}

/**
 * Default operator payment address on BSC. Both USDC and USDT are sent here.
 * Override with NEXT_PUBLIC_PAYMENT_ADDRESS / PAYMENT_ADDRESSES.
 */
export const DEFAULT_PAYMENT_ADDRESS = '0x7396727C1edd2024Acc8Ee0cBE327535C179B464'

/** Deposit address shown to buyers (public, client-safe). */
export function getPaymentAddress(): string {
  const raw = (process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ?? '').trim()
  return raw || DEFAULT_PAYMENT_ADDRESS
}

/** Server-side allow-list of addresses credited for deposits (lowercased). */
export function getPaymentAddresses(): string[] {
  const raw =
    process.env.PAYMENT_ADDRESSES ?? process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ?? DEFAULT_PAYMENT_ADDRESS
  return raw
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter((a) => /^0x[a-f0-9]{40}$/.test(a))
}

/** EIP-681 payment URI for QR codes (ERC-20 transfer on BSC). */
export function buildPaymentUri(token: TokenConfig, to: string, amount: number): string {
  const units = toTokenUnits(amount, token.decimals)
  return `ethereum:${token.address}@${PAYMENT_CHAIN_ID}/transfer?address=${to}&uint256=${units.toString()}`
}
