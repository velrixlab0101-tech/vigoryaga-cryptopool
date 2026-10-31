'use client'

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { bsc } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'
import { useEffect, useState } from 'react'

const config = getDefaultConfig({
  appName: 'CryptoPool',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'cryptopool-lottery',
  chains: [bsc],
  ssr: false,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) {
    return <>{children}</>
  }
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
