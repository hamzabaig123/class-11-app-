'use client'

import { httpBatchLink, TRPCClientError } from '@trpc/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc'
import superjson from 'superjson'
import { useState } from 'react'
import { signOut } from 'next-auth/react'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        onError: (error) => {
          // A stale/invalid session (e.g. after a DB reset) surfaces as
          // UNAUTHORIZED from protectedProcedure. Force a clean re-login
          // instead of leaving the user stuck on a broken action.
          if (
            error instanceof TRPCClientError &&
            error.data?.code === 'UNAUTHORIZED'
          ) {
            signOut({ callbackUrl: '/signin' })
          }
        },
      },
    },
  }))

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
      transformer: superjson,
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}