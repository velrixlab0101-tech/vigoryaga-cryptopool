'use client'

import { ReactNode } from 'react'

export default function MobileGameWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[420px] sm:max-w-full">
        {children}
      </div>
    </div>
  )
}
