'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  SkipForward,
  RotateCcw,
  ArrowLeft,
  BookOpen,
  Flame,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PracticeResults } from '@/types/practice'

interface ResultsPageProps {
  results: PracticeResults
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200'
  if (score >= 60) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

export function ResultsPage({ results }: ResultsPageProps) {
  const router = useRouter()

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Score Header */}
      <div className={cn('rounded-xl border-2 p-6 text-center', getScoreBg(results.score))}>
        <Trophy className={cn('h-12 w-12 mx-auto mb-3', getScoreColor(results.score))} />
        <h1 className="text-3xl font-bold mb-1">
          {results.title || 'Practice Complete'}
        </h1>
        <p className="text-5xl font-bold mb-2">{Math.round(results.score)}%</p>
        <p className="text-muted-foreground">
          {results.correctCount} correct out of {results.answeredCount} answered
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{results.correctCount}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{results.incorrectCount}</p>
            <p className="text-xs text-muted-foreground">Incorrect</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <SkipForward className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-600">{results.skippedCount}</p>
            <p className="text-xs text-muted-foreground">Skipped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{formatDuration(results.durationMs)}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Weak Topics */}
      {results.weakTopics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Topics to Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.weakTopics.map((topic) => (
              <div key={topic.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="font-medium text-sm">{topic.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {topic.correct}/{topic.total}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {Math.round(topic.accuracy)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Question Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {results.questions.map((q) => (
            <div
              key={q.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                q.status === 'ANSWERED' && q.isCorrect && 'bg-green-50/50 border-green-200',
                q.status === 'ANSWERED' && !q.isCorrect && 'bg-red-50/50 border-red-200',
                q.status === 'SKIPPED' && 'bg-yellow-50/50 border-yellow-200',
                q.status === 'UNANSWERED' && 'bg-gray-50 border-gray-200',
              )}
            >
              <span className="text-sm font-mono text-muted-foreground mt-0.5 shrink-0">
                {q.position + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  {q.subject && <Badge variant="secondary" className="text-xs">{q.subject.name}</Badge>}
                  {q.selectedOptionKey && (
                    <span className="text-xs text-muted-foreground">
                      Answered: {q.selectedOptionKey}
                    </span>
                  )}
                  {q.status === 'SKIPPED' && (
                    <span className="text-xs text-yellow-600">Skipped</span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {q.status === 'ANSWERED' && q.isCorrect && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {q.status === 'ANSWERED' && !q.isCorrect && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                {q.status === 'SKIPPED' && (
                  <SkipForward className="h-5 w-5 text-yellow-500" />
                )}
                {q.status === 'UNANSWERED' && (
                  <Target className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/revision">
            <BookOpen className="h-4 w-4 mr-2" />
            Revision
          </Link>
        </Button>
        <Button asChild>
          <Link href="/practice/new">
            <RotateCcw className="h-4 w-4 mr-2" />
            Practice Again
          </Link>
        </Button>
      </div>
    </div>
  )
}
