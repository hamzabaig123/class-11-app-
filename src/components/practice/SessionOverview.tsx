'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, SkipForward, Circle, Target } from 'lucide-react'
import type { PracticeSession, SafeQuestion } from '@/types/practice'

interface SessionOverviewProps {
  session: PracticeSession
  onNavigate: (position: number) => void
}

export function SessionOverview({ session, onNavigate }: SessionOverviewProps) {
  const totalAnswered = session.answeredCount
  const correctCount = session.correctCount
  const incorrectCount = totalAnswered - correctCount
  const skippedCount = session.questions.filter(q => q.status === 'SKIPPED').length
  const unansweredCount = session.questionCount - totalAnswered - skippedCount
  const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : null

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold">{session.questionCount}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold">{totalAnswered}</p>
          <p className="text-xs text-muted-foreground">Answered</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-green-50">
          <p className="text-2xl font-bold text-green-600">{correctCount}</p>
          <p className="text-xs text-muted-foreground">Correct</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-50">
          <p className="text-2xl font-bold text-red-600">{incorrectCount}</p>
          <p className="text-xs text-muted-foreground">Incorrect</p>
        </div>
      </div>

      <div className="text-center p-2 rounded-lg bg-muted/50">
        <p className="text-lg font-bold">
          {accuracy !== null ? `${Math.round(accuracy)}%` : '—'}
        </p>
        <p className="text-xs text-muted-foreground">Accuracy</p>
      </div>

      {/* Question Navigator */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Questions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {session.questions.map((q, idx) => {
            const isCurrent = idx === session.currentIndex
            const statusColor = getStatusStyle(q, isCurrent)

            return (
              <button
                key={q.id}
                onClick={() => onNavigate(idx)}
                className={cn(
                  'h-8 w-8 rounded-md text-xs font-medium transition-all duration-150',
                  'flex items-center justify-center',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-500 focus-visible:ring-offset-1',
                  statusColor,
                )}
                aria-label={`Question ${idx + 1}, ${getStatusLabel(q, isCurrent)}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-burgundy-600" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-green-500" />
          <span>Correct</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-red-500" />
          <span>Incorrect</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-yellow-400" />
          <span>Skipped</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-gray-200 border border-gray-300" />
          <span>Unanswered</span>
        </div>
      </div>
    </div>
  )
}

function getStatusStyle(q: SafeQuestion, isCurrent: boolean): string {
  if (isCurrent) return 'bg-burgundy-600 text-white ring-2 ring-burgundy-300'
  if (q.status === 'ANSWERED') {
    return q.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }
  if (q.status === 'SKIPPED') return 'bg-yellow-400 text-yellow-900'
  return 'bg-gray-100 text-gray-500 border border-gray-200'
}

function getStatusLabel(q: SafeQuestion, isCurrent: boolean): string {
  if (isCurrent) return 'current'
  if (q.status === 'ANSWERED') return q.isCorrect ? 'correct' : 'incorrect'
  if (q.status === 'SKIPPED') return 'skipped'
  return 'unanswered'
}
