'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'

export default function PracticeProgressPage() {
  const { data: summary, isLoading: loadingSummary } = trpc.analytics.summary.useQuery({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  })

  const { data: subjects, isLoading: loadingSubjects } = trpc.analytics.bySubject.useQuery({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  })

  const { data: chapters, isLoading: loadingChapters } = trpc.analytics.byChapter.useQuery({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  })

  const { data: weakTopics } = trpc.practice.getWeakTopics.useQuery({ limit: 10 })

  const { data: practiceSummary } = trpc.practice.summary.useQuery()

  const subjectMastery = useMemo(() => {
    if (!subjects) return []
    return subjects.map(s => ({
      ...s,
      masteryLevel: s.accuracy !== null
        ? s.accuracy >= 80 ? 'Strong'
        : s.accuracy >= 60 ? 'Developing'
        : 'Needs Focus'
        : 'No Data',
    }))
  }, [subjects])

  const chapterStats = useMemo(() => {
    if (!chapters) return []
    return chapters.map(ch => ({
      ...ch,
      statusLabel: ch.status,
    }))
  }, [chapters])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Practice Progress</h1>
          <p className="text-muted-foreground">Track your chapter mastery and learning progress</p>
        </div>
        <Button asChild>
          <Link href="/practice">
            <Zap className="h-4 w-4 mr-2" />
            Start Practice
          </Link>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-burgundy-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {summary?.attemptedCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Questions (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {summary?.accuracy !== null ? `${Math.round(summary?.accuracy ?? 0)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {practiceSummary?.dueCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Due for Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {weakTopics?.length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Weak Areas</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Mastery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject Mastery
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSubjects ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : subjectMastery.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No subject data yet</p>
              <p className="text-sm text-muted-foreground">Complete questions to see subject mastery</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subjectMastery.map(subject => (
                <div key={subject.subjectId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{subject.subjectName}</span>
                      <Badge
                        variant={
                          subject.masteryLevel === 'Strong' ? 'default' :
                          subject.masteryLevel === 'Developing' ? 'secondary' :
                          'destructive'
                        }
                        className="text-[10px]"
                      >
                        {subject.masteryLevel}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {subject.accuracy !== null ? `${Math.round(subject.accuracy)}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        subject.masteryLevel === 'Strong' ? 'bg-green-500' :
                        subject.masteryLevel === 'Developing' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${subject.accuracy ?? 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{subject.attempts} attempts</span>
                    <span>{subject.questionsAttempted} questions attempted</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chapter Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Chapter Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingChapters ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : chapterStats.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No chapter data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chapterStats.map(chapter => (
                <div key={chapter.chapterId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{chapter.chapter}</p>
                    <p className="text-xs text-muted-foreground">
                      {chapter.attempts} attempts · {chapter.questions} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {chapter.accuracy !== null ? `${Math.round(chapter.accuracy)}%` : '—'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      chapter.status === 'Strong' ? 'bg-green-100 text-green-700' :
                      chapter.status === 'Developing' ? 'bg-yellow-100 text-yellow-700' :
                      chapter.status === 'Needs focus' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {chapter.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weak Areas */}
      {weakTopics && weakTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Weak Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weakTopics.map((topic: any) => (
              <div key={topic.id} className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50/50">
                <div>
                  <p className="font-medium text-sm">{topic.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {topic.subject} · {topic.correctCount} correct / {topic.incorrectCount + topic.correctCount} total
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-700">
                    {Math.round(topic.weaknessScore)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">error rate</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
