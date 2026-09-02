'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        We encountered an unexpected error. Please try again or contact support if the problem persists.
      </p>
      <Button onClick={reset}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  )
}
