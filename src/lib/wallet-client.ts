import { useSignMessage } from 'wagmi'
import {
  WALLET_HEADERS,
  buildWalletMessage,
  encodeWalletMessage,
} from '@/lib/wallet-auth'

export { WALLET_HEADERS, buildWalletMessage, REDEEM_PURPOSE } from '@/lib/wallet-auth'

/**
 * Signs a message authorizing a user-scoped action and returns the headers the
 * API expects. Used for spending one's own credit balance (no on-chain tx).
 */
export async function buildWalletFetchHeaders(
  address: string | undefined | null,
  purpose: string,
  signMessageAsync: ReturnType<typeof useSignMessage>['signMessageAsync'],
): Promise<Record<string, string>> {
  if (!address) return {}
  const message = buildWalletMessage(address, purpose)
  const signature = await signMessageAsync({ message })
  return {
    [WALLET_HEADERS.wallet]: address.toLowerCase(),
    [WALLET_HEADERS.message]: encodeWalletMessage(message),
    [WALLET_HEADERS.signature]: signature,
  }
}
