'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  ERC20_ABI,
  PAYMENT_CHAIN_ID,
  TOKENS,
  TOKEN_SYMBOLS,
  buildPaymentUri,
  fromTokenUnits,
  getPaymentAddress,
  isTokenSymbol,
  toTokenUnits,
  type TokenSymbol,
} from '@/lib/tokens'
import { Countdown } from '@/components/Countdown'
import { errorMessage } from '@/lib/errors'

interface Draw {
  id: string
  title: string
  ticketPrice: number
  operatorFeePct: number
  status: string
  startTime: string
  closeTime: string
  potTotal: number
  tickets: { qty: number; amount: number; buyerAddress?: string | null }[]
}

type Step = 'idle' | 'paying' | 'recording' | 'done'

export default function DrawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [referrerCode, setReferrerCode] = useState<string | undefined>()
  const { address, chainId, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [draw, setDraw] = useState<Draw | null>(null)
  const [qty, setQty] = useState(1)
  const [token, setToken] = useState<TokenSymbol>('USDC')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [manualHash, setManualHash] = useState('')

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

  const tokenConfig = TOKENS[token]
  const paymentAddress = getPaymentAddress()
  const chainSupported = chainId !== undefined && chainId === PAYMENT_CHAIN_ID
  const total = draw ? draw.ticketPrice * qty : 0
  const open = draw?.status === 'open'

  const { data: balance } = useReadContract({
    address: tokenConfig.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })
  const balanceNum = typeof balance === 'bigint' ? fromTokenUnits(balance, tokenConfig.decimals) : 0
  const insufficient = isConnected && balanceNum < total

  const recordTx = async (hash: string) => {
    if (!draw) return
    setStep('recording')
    const res = await fetch(`/api/draws/${draw.id}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: hash, token, referrerCode }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to record ticket')
      setStep('idle')
      return
    }
    setStep('done')
    load()
  }

  const pay = async () => {
    try {
      setError('')
      if (!draw || !address || !publicClient) return
      if (!paymentAddress) {
        setError('Payment address not configured')
        return
      }
      if (!chainSupported) {
        setError('Switch to BNB Smart Chain first')
        return
      }
      if (qty < 1) {
        setError('Choose at least one ticket')
        return
      }
      if (insufficient) {
        setError(`Not enough ${token} balance`)
        return
      }
      const amount = toTokenUnits(total, tokenConfig.decimals)

      setStep('paying')
      const hash = await writeContractAsync({
        address: tokenConfig.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [paymentAddress as `0x${string}`, amount],
      })
      setTxHash(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      await recordTx(hash)
    } catch (e) {
      setError(errorMessage(e, 'Payment failed'))
      setStep('idle')
    }
  }

  const submitManual = async () => {
    try {
      setError('')
      if (!/^0x[a-fA-F0-9]{64}$/.test(manualHash.trim())) {
        setError('Enter a valid transaction hash')
        return
      }
      await recordTx(manualHash.trim())
    } catch (e) {
      setError(errorMessage(e, 'Failed to record ticket'))
      setStep('idle')
    }
  }

  if (!draw) {
    return <div className="min-h-screen flex items-center justify-center text-foreground/70">Loading…</div>
  }

  const busy = step === 'paying' || step === 'recording'
  const paymentUri = paymentAddress
    ? buildPaymentUri(tokenConfig, paymentAddress, total)
    : ''

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/draws" className="text-accent hover:underline text-sm">
          ← All draws
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <h1 className="min-w-0 break-words text-4xl font-bold">{draw.title}</h1>
            <span className="shrink-0 px-3 py-1 bg-accent/20 text-accent rounded-full text-sm">{draw.status}</span>
          </div>
          <p className="text-foreground/70 mb-8">
            Ticket ${draw.ticketPrice} • Pot ${draw.potTotal.toFixed(2)} • Closes{' '}
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
              <p className="text-foreground/70 mb-4">Your tickets were recorded.</p>
              {txHash && (
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline text-sm"
                >
                  View transaction ↗
                </a>
              )}
              <div className="mt-4">
                <button
                  onClick={() => {
                    setStep('idle')
                    setQty(1)
                    setManualHash('')
                  }}
                  className="bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
                >
                  Buy more
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span>Payment token</span>
                <div className="flex gap-2">
                  {TOKEN_SYMBOLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => isTokenSymbol(s) && setToken(s)}
                      className={`px-3 py-1 rounded text-sm ${
                        token === s ? 'bg-accent text-background' : 'bg-background border border-surface'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
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
                <span className="font-bold text-accent">
                  {total.toFixed(2)} {token}
                </span>
              </div>

              {!open ? (
                <p className="text-center text-foreground/70">
                  Ticket sales are {draw.status === 'open' ? 'closed' : draw.status}.
                </p>
              ) : !paymentAddress ? (
                <p className="text-center text-yellow-400 text-sm">
                  Payment address not configured (set NEXT_PUBLIC_PAYMENT_ADDRESS).
                </p>
              ) : (
                <>
                  {isConnected && (
                    <p className="text-xs text-foreground/50 mb-3 text-center">
                      Balance: {balanceNum.toFixed(2)} {token}
                      {insufficient && <span className="text-red-400"> — not enough</span>}
                    </p>
                  )}

                  <div className="grid sm:grid-cols-[auto,1fr] gap-5 items-start mb-5">
                    <div className="bg-white p-3 rounded-lg mx-auto">
                      <QRCodeSVG value={paymentUri} size={148} />
                    </div>
                    <div className="text-sm">
                      <p className="text-foreground/60 mb-1">Send exactly</p>
                      <p className="text-xl font-bold text-accent mb-3">
                        {total.toFixed(2)} {token}
                      </p>
                      <p className="text-foreground/60 mb-1">on BNB Smart Chain to</p>
                      <code className="block break-all text-xs bg-background rounded p-2 mb-2">
                        {paymentAddress}
                      </code>
                      <button
                        onClick={() => navigator.clipboard?.writeText(paymentAddress)}
                        className="text-accent text-xs hover:underline"
                      >
                        Copy address
                      </button>
                    </div>
                  </div>

                  {!isConnected ? (
                    <div className="flex justify-center">
                      <ConnectButton />
                    </div>
                  ) : !chainSupported ? (
                    <button
                      onClick={() => switchChainAsync({ chainId: PAYMENT_CHAIN_ID })}
                      className="w-full bg-accent text-background py-3 rounded-lg font-semibold hover:bg-accent/90"
                    >
                      Switch to BNB Smart Chain
                    </button>
                  ) : (
                    <button
                      onClick={pay}
                      disabled={busy || insufficient}
                      className="w-full bg-accent text-background py-3 rounded-lg font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {step === 'paying'
                        ? `Sending ${token}…`
                        : step === 'recording'
                          ? 'Recording ticket…'
                          : `Pay ${total.toFixed(2)} ${token} with wallet`}
                    </button>
                  )}

                  <div className="mt-5 pt-5 border-t border-surface">
                    <p className="text-foreground/60 text-xs mb-2">
                      Paid from another wallet? Paste the transaction hash to record it.
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={manualHash}
                        onChange={(e) => setManualHash(e.target.value)}
                        placeholder="0x…"
                        className="flex-1 bg-background border border-surface px-3 py-2 rounded-lg text-sm font-mono"
                      />
                      <button
                        onClick={submitManual}
                        disabled={busy}
                        className="border border-accent/40 text-accent px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent/10 disabled:opacity-50"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </>
              )}

              {txHash && <p className="mt-3 text-xs text-foreground/50 break-all">tx: {txHash}</p>}
              {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
