'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  LogOut,
  Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import type { PracticeSession, PracticeMode } from '@/types/practice'

interface PracticeHeaderProps {
  session: PracticeSession
  onExit: () => void
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function getModeLabel(mode: PracticeMode): string {
  switch (mode) {
    case 'QUICK': return 'Quick Practice'
    case 'SUBJECT': return 'Subject Practice'
    case 'WEAK': return 'Weak Areas'
    case 'REVIEW': return 'Due Review'
    case 'COLLECTION': return 'Collection Practice'
    case 'MOCK': return 'Mock Test'
    case 'UNANSWERED': return 'Unanswered'
    default: return 'Practice'
  }
}

export function PracticeHeader({ session, onExit }: PracticeHeaderProps) {
  const router = useRouter()
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(() => {
    if (!session.startedAt) return 0
    return Date.now() - new Date(session.startedAt).getTime()
  })

  useEffect(() => {
    if (!session.startedAt) return
    const interval = setInterval(() => {
      const startedAt = session.startedAt
      if (startedAt) {
        setElapsedMs(Date.now() - new Date(startedAt).getTime())
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [session.startedAt])

  const handleSaveAndExit = useCallback(() => {
    router.push('/dashboard')
    setExitDialogOpen(false)
  }, [router])

  const handleAbandon = useCallback(() => {
    onExit()
    setExitDialogOpen(false)
  }, [onExit])

  const isTimed = session.timeLimitSeconds != null && session.timeLimitSeconds > 0
  const remainingSeconds = isTimed
    ? Math.max(0, session.timeLimitSeconds! - Math.floor(elapsedMs / 1000))
    : 0
  const remainingPct = isTimed ? (remainingSeconds / session.timeLimitSeconds!) * 100 : 100
  const timerWarning = remainingPct <= 10 ? 'critical' : remainingPct <= 25 ? 'warning' : 'normal'

  return (
    <>
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="hidden sm:block">
              <p className="text-sm font-medium truncate max-w-[200px]">
                {session.title || getModeLabel(session.mode)}
              </p>
              <p className="text-xs text-muted-foreground">
                {getModeLabel(session.mode)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="outline" className="text-xs font-mono">
              {session.currentIndex + 1} / {session.questionCount}
            </Badge>

            {isTimed ? (
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-mono font-medium',
                timerWarning === 'critical' && 'bg-red-100 text-red-700 animate-pulse',
                timerWarning === 'warning' && 'bg-yellow-100 text-yellow-700',
                timerWarning === 'normal' && 'bg-muted',
              )}>
                <Timer className="h-3.5 w-3.5" />
                <span>{formatRemaining(remainingSeconds)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-sm font-mono">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatElapsed(elapsedMs)}</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExitDialogOpen(true)}
              aria-label="Exit practice"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exit Practice?</DialogTitle>
            <DialogDescription>
              Your progress is saved automatically. You can resume this session later from the Dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>
              Continue Practicing
            </Button>
            <Button variant="secondary" onClick={handleSaveAndExit}>
              Save & Exit
            </Button>
            <Button variant="destructive" onClick={handleAbandon}>
              Abandon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
