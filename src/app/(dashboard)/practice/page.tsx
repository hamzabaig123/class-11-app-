'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Play,
  Clock,
  Brain,
  Target,
  BookOpen,
  AlertTriangle,
  Zap,
  RotateCcw,
  ChevronRight,
  Trophy,
  Flame,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'

export default function PracticeHomePage() {
  const router = useRouter()
  const [quickPracticeLoading, setQuickPracticeLoading] = useState(false)

  const { data: summary, isLoading } = trpc.practice.summary.useQuery()
  const { data: options } = trpc.practice.getOptions.useQuery()

  const createSession = trpc.practice.createSession.useMutation({
    onSuccess: (session) => {
      router.push(`/practice/${session.sessionId}`)
    },
    onError: (e) => {
      setQuickPracticeLoading(false)
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    },
  })

  const handleQuickPractice = () => {
    setQuickPracticeLoading(true)
    createSession.mutate({
      mode: 'QUICK',
      count: 10,
      randomize: true,
    })
  }

  const handleWeakAreas = () => {
    setQuickPracticeLoading(true)
    createSession.mutate({
      mode: 'WEAK',
      count: 10,
      randomize: true,
    })
  }

  const handleDueReview = () => {
    setQuickPracticeLoading(true)
    createSession.mutate({
      mode: 'REVIEW',
      count: 10,
      randomize: true,
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-4">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Practice</h1>
          <p className="text-muted-foreground">Build mastery through active recall and spaced repetition</p>
        </div>
        <Button asChild>
          <Link href="/practice/new">
            <Target className="h-4 w-4 mr-2" />
            Custom Practice
          </Link>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Practice */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleQuickPractice}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-burgundy-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-burgundy-600" />
                </div>
                <h3 className="font-semibold">Quick Practice</h3>
                <p className="text-sm text-muted-foreground">10 random questions to warm up</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Weak Areas */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleWeakAreas}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="font-semibold">Weak Areas</h3>
                <p className="text-sm text-muted-foreground">
                  Focus on questions you struggle with
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Due Review */}
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={handleDueReview}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold">Due Review</h3>
                <p className="text-sm text-muted-foreground">
                  {summary?.dueCount ?? 0} questions due for revision
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(summary?.dueCount ?? 0) > 0 && (
                  <Badge variant="destructive">{summary?.dueCount}</Badge>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Session */}
      {summary?.unfinishedSession && (
        <Card className="border-burgundy-200 bg-burgundy-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-burgundy-100 flex items-center justify-center">
                  <Play className="h-5 w-5 text-burgundy-600" />
                </div>
                <div>
                  <p className="font-medium">{summary.unfinishedSession.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Question {summary.unfinishedSession.currentIndex + 1} of{' '}
                    {summary.unfinishedSession.questionCount}
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href={`/practice/${summary.unfinishedSession.id}`}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Today&apos;s Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{summary?.todayStats.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">{summary?.todayStats.correct ?? 0}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {summary?.todayStats.total
                  ? Math.round((summary.todayStats.correct / summary.todayStats.total) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-50">
              <p className="text-2xl font-bold text-orange-600">{summary?.dueCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Due Review</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weak Topics */}
      {summary?.weakTopics && summary.weakTopics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.weakTopics.map((topic) => (
              <div key={topic.questionId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{topic.questionText}</p>
                  <p className="text-xs text-muted-foreground">{topic.subjectName}</p>
                </div>
                <Badge variant="outline" className="text-[10px] ml-2">
                  {topic.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {summary?.recentSessions && summary.recentSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.title || 'Practice Session'}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.questionCount} questions
                    {session.completedAt && ` • ${new Date(session.completedAt).toLocaleDateString()}`}
                  </p>
                </div>
                {session.score !== null && (
                  <Badge
                    variant={session.score >= 70 ? 'default' : 'destructive'}
                    className="text-xs ml-2"
                  >
                    {Math.round(session.score)}%
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!summary?.recentSessions.length && !summary?.unfinishedSession && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Start Your First Practice</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Begin with a quick practice session to identify your strengths and areas for improvement.
              The system will track your progress and recommend what to review next.
            </p>
            <Button className="mt-4" onClick={handleQuickPractice}>
              <Play className="h-4 w-4 mr-2" />
              Start Quick Practice
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
