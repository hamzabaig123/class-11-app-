'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface DashboardErrorStateProps {
  message?: string
  onRetry: () => void
}

export function DashboardErrorState({ message, onRetry }: DashboardErrorStateProps) {
  return (
    <div className="space-y-6">
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">Unable to load dashboard</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {message ?? 'Something went wrong while fetching your data. Please try again.'}
              </p>
            </div>
            <Button onClick={onRetry} className="gap-2 mt-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}