import { useSignMessage } from 'wagmi'
import {
  ADMIN_HEADERS,
  buildAdminMessage,
  decodeAdminMessage,
  encodeAdminMessage,
  getAdminWallet,
  isAdminAddress,
  normalizeWallet,
} from '@/lib/admin-wallet'

export {
  ADMIN_HEADERS,
  buildAdminMessage,
  decodeAdminMessage,
  encodeAdminMessage,
  getAdminWallet,
  isAdminAddress,
  normalizeWallet,
}

/** Builds the fetch headers required to authenticate an admin request. */
export async function buildAdminFetchHeaders(
  address: string | undefined | null,
  signMessageAsync: ReturnType<typeof useSignMessage>['signMessageAsync'],
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  const adminWallet = getAdminWallet()
  if (!address) return headers
  if (adminWallet && normalizeWallet(address) !== normalizeWallet(adminWallet)) {
    return headers
  }
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    const token = process.env.NEXT_PUBLIC_ADMIN_DEV_TOKEN || 'dev-admin'
    headers[ADMIN_HEADERS.token] = token
    if (adminWallet) headers[ADMIN_HEADERS.wallet] = normalizeWallet(adminWallet)
    return headers
  }
  const timestamp = Date.now()
  const message = buildAdminMessage(address, timestamp)
  const signature = await signMessageAsync({ message })
  headers[ADMIN_HEADERS.wallet] = address.toLowerCase()
  headers[ADMIN_HEADERS.message] = encodeAdminMessage(message)
  headers[ADMIN_HEADERS.signature] = signature
  return headers
}
