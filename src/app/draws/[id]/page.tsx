'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  ERC20_ABI,
  RAFFLE_VAULT_ABI,
  getUsdcAddress,
  getVaultAddress,
  toUsdcUnits,
} from '@/lib/contracts'
import { SUPPORTED_CHAIN_IDS } from '@/lib/chain'
import { Countdown } from '@/components/Countdown'
import { errorMessage } from '@/lib/errors'

interface Draw {
  id: string
  chainDrawId: number | null
  title: string
  ticketPrice: number
  operatorFeePct: number
  status: string
  startTime: string
  closeTime: string
  potTotal: number
  tickets: { qty: number; amount: number; buyerAddress: string }[]
}

type Step = 'idle' | 'approving' | 'buying' | 'recording' | 'done'

export default function DrawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [referrerCode, setReferrerCode] = useState<string | undefined>()
  const { address, chainId, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [draw, setDraw] = useState<Draw | null>(null)
  const [qty, setQty] = useState(1)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<string>('')

  const load = () => {
    fetch(`/api/draws/${id}`)
      .then((r) => r.json())
      .then(setDraw)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setReferrerCode(ref)
  }, [])

  const vault = getVaultAddress()
  const chainSupported = chainId !== undefined && (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId)
  const total = draw ? draw.ticketPrice * qty : 0
  const open = draw?.status === 'open'

  const buy = async () => {
    try {
      setError('')
      if (!draw || !address || !publicClient) return
      if (!vault) {
        setError('Vault address not configured')
        return
      }
      if (draw.chainDrawId === null || draw.chainDrawId === undefined) {
        setError('Draw has no on-chain id')
        return
      }
      if (!chainSupported) {
        setError('Switch to a supported network first')
        return
      }
      if (qty < 1) {
        setError('Choose at least one ticket')
        return
      }
      const amount = toUsdcUnits(draw.ticketPrice * qty)
      const usdc = getUsdcAddress(chainId)

      const allowance = (await publicClient.readContract({
        address: usdc,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, vault],
      })) as bigint

      if (allowance < amount) {
        setStep('approving')
        const approveHash = await writeContractAsync({
          address: usdc,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [vault, amount],
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      setStep('buying')
      const buyHash = await writeContractAsync({
        address: vault,
        abi: RAFFLE_VAULT_ABI,
        functionName: 'buyTickets',
        args: [BigInt(draw.chainDrawId), amount],
      })
      setTxHash(buyHash)
      await publicClient.waitForTransactionReceipt({ hash: buyHash })

      setStep('recording')
      const res = await fetch(`/api/draws/${draw.id}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: buyHash, referrerCode }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to record ticket')
        setStep('idle')
        return
      }
      setStep('done')
      load()
    } catch (e) {
      setError(errorMessage(e, 'Purchase failed'))
      setStep('idle')
    }
  }

  if (!draw) {
    return <div className="min-h-screen flex items-center justify-center text-foreground/70">Loading…</div>
  }

  const busy = step === 'approving' || step === 'buying' || step === 'recording'

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/draws" className="text-accent hover:underline text-sm">
          ← All draws
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <h1 className="text-4xl font-bold">{draw.title}</h1>
            <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm">{draw.status}</span>
          </div>
          <p className="text-foreground/70 mb-8">
            Ticket ${draw.ticketPrice} USDC • Pot ${draw.potTotal.toFixed(2)} USDC • Closes{' '}
            {new Date(draw.closeTime).toLocaleString()}
          </p>
          <div className="flex items-center gap-3 mb-8">
            <span className="text-sm text-foreground/60">Closes in</span>
            <Countdown to={draw.closeTime} />
          </div>
        </motion.div>

        <div className="bg-surface rounded-xl p-6 border border-accent/20">
          {step === 'done' ? (
            <div className="text-center py-6">
              <p className="text-2xl font-semibold text-accent mb-2">You&apos;re in! 🎟️</p>
              <p className="text-foreground/70 mb-4">Your tickets were recorded on-chain.</p>
              <button
                onClick={() => {
                  setStep('idle')
                  setQty(1)
                }}
                className="bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
              >
                Buy more
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span>Number of tickets</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded bg-background border border-surface"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="w-8 h-8 rounded bg-background border border-surface"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-lg mb-6">
                <span>Total</span>
                <span className="font-bold text-accent">${total.toFixed(2)} USDC</span>
              </div>

              {!isConnected ? (
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              ) : !chainSupported ? (
                <button
                  onClick={() => switchChainAsync({ chainId: 8453 })}
                  className="w-full bg-accent text-background py-3 rounded-lg font-semibold hover:bg-accent/90"
                >
                  Switch to Base
                </button>
              ) : !open ? (
                <p className="text-center text-foreground/70">
                  Ticket sales are {draw.status === 'open' ? 'closed' : draw.status}.
                </p>
              ) : (
                <button
                  onClick={buy}
                  disabled={busy || !vault}
                  className="w-full bg-accent text-background py-3 rounded-lg font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step === 'approving'
                    ? 'Approving USDC…'
                    : step === 'buying'
                      ? 'Confirming purchase…'
                      : step === 'recording'
                        ? 'Recording ticket…'
                        : `Buy ${qty} ticket${qty > 1 ? 's' : ''} · $${total.toFixed(2)}`}
                </button>
              )}

              {!vault && (
                <p className="mt-3 text-xs text-yellow-400">
                  Vault not configured (set NEXT_PUBLIC_RAFFLE_VAULT).
                </p>
              )}
              {txHash && (
                <p className="mt-3 text-xs text-foreground/50 break-all">tx: {txHash}</p>
              )}
              {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
