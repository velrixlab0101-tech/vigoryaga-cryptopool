export const RAFFLE_VAULT_ABI = [
  {
    type: 'function',
    name: 'buyTickets',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'drawId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'payoutBatch',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'drawId', type: 'uint256' },
      { name: 'winners', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'places', type: 'uint8[]' },
      { name: 'operator', type: 'address' },
      { name: 'operatorAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Payout',
    inputs: [
      { name: 'drawId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'place', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OperatorPayout',
    inputs: [
      { name: 'drawId', type: 'uint256', indexed: true },
      { name: 'operator', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TicketSale',
    inputs: [
      { name: 'drawId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const

export const USDC_DECIMALS = 6

export function getVaultAddress(): `0x${string}` | '' {
  return (process.env.NEXT_PUBLIC_RAFFLE_VAULT ?? '').trim() as `0x${string}` | ''
}

export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
export const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const

export function getUsdcAddress(chainId?: number): `0x${string}` {
  if (chainId === 84532) return USDC_BASE_SEPOLIA
  const configured = (process.env.NEXT_PUBLIC_USDC_BASE ?? '').trim()
  if (configured) return configured as `0x${string}`
  return USDC_BASE
}

/** Dollars -> USDC base units (6 decimals). */
export function toUsdcUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS))
}

/** USDC base units -> dollars. */
export function fromUsdcUnits(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS
}
