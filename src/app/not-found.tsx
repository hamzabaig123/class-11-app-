'use client'

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h1 className="text-6xl font-bold text-burgundy-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  )
}
