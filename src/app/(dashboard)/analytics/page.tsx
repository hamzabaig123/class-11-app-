'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Target, Clock, Flame, BookOpen, Award, Download, ArrowRight, ChevronDown, Info, Eye, Lightbulb, Zap, Calendar, BarChart3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
import { formatPercentage, formatDuration } from '@/lib/utils'
import Link from 'next/link'

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'year', label: 'This year', days: 365 },
  { value: 'all', label: 'All time', days: 3650 },
]

function getDateRange(range: string) {
  const to = new Date()
  const entry = DATE_RANGES.find(r => r.value === range)
  const from = new Date()
  from.setDate(from.getDate() - (entry?.days ?? 30))
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')
  const range = useMemo(() => getDateRange(dateRange), [dateRange])

  const { data: summary, isLoading: loadingSummary } = trpc.analytics.summary.useQuery({
    from: range.from, to: range.to,
  })

  const { data: accuracyTrend, isLoading: loadingTrend } = trpc.analytics.accuracyTrend.useQuery({
    from: range.from, to: range.to,
  })

  const { data: subjects, isLoading: loadingSubjects } = trpc.analytics.bySubject.useQuery({
    from: range.from, to: range.to,
  })

  const { data: chapters, isLoading: loadingChapters } = trpc.analytics.byChapter.useQuery({
    from: range.from, to: range.to,
  })

  const { data: recommendation } = trpc.analytics.recommendation.useQuery({
    from: range.from, to: range.to,
  })

  const { data: weakTopics } = trpc.practice.getWeakTopics.useQuery({ limit: 5 })

  const maxAccuracy = useMemo(() => {
    if (!accuracyTrend || accuracyTrend.length === 0) return 100
    return Math.max(...accuracyTrend.map(d => d.accuracy), 100)
  }, [accuracyTrend])

  const totalAttempts = summary?.attemptedCount ?? 0
  const accuracy = summary?.accuracy
  const studyTimeSec = summary?.studyTimeSeconds ?? 0
  const streak = summary?.studyStreakDays ?? 0

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'start-due-review': return 'Start Due Review'
      case 'start-practice': return 'Start Practice'
      case 'review-incorrect': return 'Review Incorrect'
      case 'mixed-challenge': return 'Try Challenge'
      case 'continue-practice': return 'Continue Practice'
      default: return 'Get Started'
    }
  }

  const getActionHref = (action: string) => {
    switch (action) {
      case 'start-due-review': return '/revision'
      case 'start-practice': return '/practice/new'
      case 'review-incorrect': return '/questions?filter=incorrect'
      case 'mixed-challenge': return '/practice/new'
      case 'continue-practice': return '/practice/new'
      default: return '/dashboard'
    }
  }

  const getDifficultyBreakdown = () => {
    // This would be aggregated from attempts data in a real implementation
    return { easy: 0, medium: 0, hard: 0 }
  }

  const difficultyBreakdown = getDifficultyBreakdown()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Analytics</h1>
          <p className="text-muted-foreground">Understand your progress and focus your next session</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" title="Export data"><Download className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Questions Attempted</CardTitle>
            <Target className="h-4 w-4 text-burgundy-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loadingSummary ? '—' : totalAttempts}</div>
            <p className="text-xs text-muted-foreground mt-1">in selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Accuracy</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingSummary ? '—' : accuracy !== null && accuracy !== undefined ? `${Math.round(accuracy)}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAttempts > 0 ? `${totalAttempts} attempts` : 'No attempts yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingSummary ? '—' : studyTimeSec > 0 ? formatDuration(studyTimeSec * 1000) : '0 min'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">total practice time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loadingSummary ? '—' : `${streak} day${streak !== 1 ? 's' : ''}`}</div>
            <p className="text-xs text-muted-foreground mt-1">consecutive study days</p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Over Time */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Accuracy Over Time</CardTitle>
              <CardDescription>Your performance trend across sessions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTrend ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading chart...</div>
            </div>
          ) : !accuracyTrend || accuracyTrend.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No activity in this period</p>
              <p className="text-sm text-muted-foreground">Complete some practice sessions to see your accuracy trend</p>
              <Link href="/practice/new"><Button className="mt-4" size="sm">Start Practice</Button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-1 h-[250px] overflow-x-auto pb-2">
                {accuracyTrend.map((point, i) => (
                  <div key={point.date} className="flex flex-col items-center min-w-[40px] flex-1 group">
                    <div className="relative w-full flex flex-col items-center">
                      <div className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-popover border rounded px-2 py-1 shadow-sm whitespace-nowrap z-10">
                        {Math.round(point.accuracy)}% ({point.correct}/{point.attempts})
                      </div>
                      <div
                        className="w-full bg-burgundy-600 rounded-t transition-all hover:bg-burgundy-700"
                        style={{ height: `${(point.accuracy / maxAccuracy) * 200}px`, minHeight: '4px' }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                      {point.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
            <CardDescription>Accuracy breakdown by subject</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSubjects ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
              </div>
            ) : !subjects || subjects.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No subject data yet</p>
                <p className="text-sm text-muted-foreground">Complete questions to see subject breakdown</p>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map(subject => (
                  <div key={subject.subjectId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{subject.subjectName}</span>
                      <span className="text-muted-foreground">{subject.attempts} attempts</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-burgundy-600 rounded-full transition-all" style={{ width: `${subject.accuracy ?? 0}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Accuracy: {formatPercentage(subject.accuracy)}</span>
                      <span>{subject.questionsAttempted} questions</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chapter Strengths */}
        <Card>
          <CardHeader>
            <CardTitle>Chapter Strengths</CardTitle>
            <CardDescription>Performance by chapter/topic</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingChapters ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
              </div>
            ) : !chapters || chapters.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No chapter data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.slice(0, 10).map(chapter => (
                  <div key={chapter.chapterId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{chapter.chapter}</p>
                      <p className="text-xs text-muted-foreground">
                        {chapter.attempts} attempts · {chapter.accuracy !== null ? `${Math.round(chapter.accuracy)}%` : '—'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      chapter.status === 'Strong' ? 'bg-green-100 text-green-700' :
                      chapter.status === 'Developing' ? 'bg-yellow-100 text-yellow-700' :
                      chapter.status === 'Needs focus' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {chapter.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weak Areas & Recommendations */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weak Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-yellow-500" />Weak Areas</CardTitle>
            <CardDescription>Topics that need more attention</CardDescription>
          </CardHeader>
          <CardContent>
            {!weakTopics || weakTopics.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No weak areas detected yet</p>
                <p className="text-sm text-muted-foreground">Keep practicing to get personalized insights</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakTopics.map((topic: any) => (
                  <div key={topic.id} className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50/50">
                    <div>
                      <p className="font-medium text-sm">{topic.name}</p>
                      <p className="text-xs text-muted-foreground">{topic.subject} · {topic.incorrectCount} incorrect</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-700">{Math.round(topic.weaknessScore)}%</p>
                      <p className="text-[10px] text-muted-foreground">weakness</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Best Action */}
        <Card className="border-burgundy-200 bg-burgundy-50/50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-burgundy-100 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-burgundy-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-burgundy-900">Next Best Action</h3>
                <p className="text-sm text-burgundy-700 mt-1">{recommendation?.reason || 'Start a practice session to get personalized recommendations.'}</p>
                <Link href={recommendation ? getActionHref(recommendation.action) : '/practice/new'}>
                  <Button size="sm" className="mt-3" variant="default">
                    {recommendation ? getActionLabel(recommendation.action) : 'Start Practice'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
