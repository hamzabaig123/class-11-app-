'use client'

import { SessionProvider } from 'next-auth/react'
import { TRPCProvider } from '@/components/providers/TRPCProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider, ToastViewport } from '@/components/ui/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <TooltipProvider>
          {children}
          <ToastProvider>
            <ToastViewport />
          </ToastProvider>
        </TooltipProvider>
      </TRPCProvider>
    </SessionProvider>
  )
}