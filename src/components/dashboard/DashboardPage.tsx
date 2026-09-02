'use client'

import { useCallback, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import { Target, Brain, BookOpen, Clock, Flame, Play, Plus, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Calendar, TrendingUp, Award, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardSkeleton } from './DashboardSkeleton'
import { DashboardErrorState } from './DashboardErrorState'

export function DashboardPage() {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = trpc.dashboard.summary.useQuery()

  const handleStartPractice = useCallback(() => {
    router.push('/practice/new')
  }, [router])

  const handleContinueSession = useCallback(() => {
    if (data?.unfinishedSession) {
      router.push(`/practice/${data.unfinishedSession.id}`)
    }
  }, [router, data])

  const handleReviewMistakes = useCallback(() => {
    router.push('/practice/new?mode=mistakes')
  }, [router])

  const handleReviewDue = useCallback(() => {
    router.push('/revision')
  }, [router])

  const handleAddQuestion = useCallback(() => {
    router.push('/questions/new')
  }, [router])

  const handleImport = useCallback(() => {
    router.push('/ai-studio')
  }, [router])

  const handlePracticeWeakTopic = useCallback((topicId: string) => {
    router.push(`/practice/new?topicId=${topicId}&mode=weak`)
  }, [router])

  const handleViewSubject = useCallback((subjectId: string) => {
    router.push(`/subjects/${subjectId}`)
  }, [router])

  if (isLoading) return <DashboardSkeleton />
  if (isError) return <DashboardErrorState message={error?.message} onRetry={() => refetch()} />
  if (!data) return <DashboardSkeleton />

  const hasUnfinishedSession = !!data.unfinishedSession

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {data.user.displayName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {data.dueTodayCount > 0
              ? `You have ${data.dueTodayCount} question${data.dueTodayCount !== 1 ? 's' : ''} due for review.`
              : data.questionCount > 0
                ? `All caught up! ${data.questionCount} questions in your library.`
                : 'Your revision space. Build your edge, one question at a time.'}
          </p>
        </div>
        {data.dueTodayCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 border border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">{data.dueTodayCount} due today</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button size="lg" className="h-auto py-4 flex-col gap-2" onClick={handleStartPractice}>
          <Play className="h-6 w-6" />
          <span>Start Practice</span>
        </Button>
        {hasUnfinishedSession && (
          <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={handleContinueSession}>
            <RefreshCw className="h-6 w-6" />
            <span>Continue ({data.unfinishedSession!.currentIndex}/{data.unfinishedSession!.totalQuestions})</span>
          </Button>
        )}
        <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={handleReviewDue}>
          <Brain className="h-6 w-6" />
          <span>Review Due</span>
        </Button>
        <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={handleAddQuestion}>
          <Plus className="h-6 w-6" />
          <span>Add Question</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Questions Attempted</CardTitle>
            <Target className="h-4 w-4 text-burgundy-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.attemptedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.accuracy !== null && data.accuracy !== undefined ? `${Math.round(data.accuracy)}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.studyStreakDays} day{data.studyStreakDays !== 1 ? 's' : ''}</div>
            <p className="text-xs text-muted-foreground mt-1">Consecutive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due for Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.dueTodayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions & Study Plan */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" />Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {hasUnfinishedSession ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{data.unfinishedSession!.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.unfinishedSession!.currentIndex} of {data.unfinishedSession!.totalQuestions} questions
                      </p>
                    </div>
                    <Button size="sm" onClick={handleContinueSession}>
                      Resume <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-burgundy-600 rounded-full transition-all"
                      style={{ width: `${(data.unfinishedSession!.currentIndex / data.unfinishedSession!.totalQuestions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Play className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No active sessions</p>
                <Button size="sm" className="mt-3" onClick={handleStartPractice}>
                  <Play className="h-3 w-3 mr-1" />Start Practice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Study Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Today's Study Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.dueTodayCount > 0 && (
                <button onClick={handleReviewDue} className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Review Due Questions</p>
                        <p className="text-xs text-muted-foreground">{data.dueTodayCount} questions waiting</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              )}
              <button onClick={handleReviewMistakes} className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Review Mistakes</p>
                      <p className="text-xs text-muted-foreground">Practice wrong answers</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
              <button onClick={handleStartPractice} className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-burgundy-100 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-burgundy-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Quick Practice</p>
                      <p className="text-xs text-muted-foreground">10 random questions</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart & Subject Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 7-Day Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />7-Day Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-[200px]">
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date()
                date.setDate(date.getDate() - (6 - i))
                const dayName = date.toLocaleDateString('en', { weekday: 'short' })
                const value = Math.floor(Math.random() * 20) + 1 // Placeholder - would use real data
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center">
                      <div
                        className="w-full bg-burgundy-600 rounded-t transition-all hover:bg-burgundy-700"
                        style={{ height: `${(value / 20) * 150}px`, minHeight: '4px' }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{dayName}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {data.subjects && data.subjects.length > 0 ? (
              <div className="space-y-3">
                {data.subjects.slice(0, 5).map(subject => (
                  <button
                    key={subject.id}
                    onClick={() => handleViewSubject(subject.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{subject.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {subject.accuracy !== null ? `${Math.round(subject.accuracy)}%` : '—'}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-burgundy-600 rounded-full transition-all"
                        style={{ width: `${subject.accuracy ?? 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{subject.questionCount} questions</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No subjects yet</p>
                <Button size="sm" className="mt-3" onClick={() => router.push('/subjects/new')}>
                  <Plus className="h-3 w-3 mr-1" />Add Subject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

              {data.weakTopics && data.weakTopics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Weak Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {data.weakTopics.map((topic: any) => (
                        <div key={topic.id} className="p-4 rounded-lg border bg-red-50/50 border-red-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{topic.name || topic.id}</span>
                            <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">
                              {Math.round(topic.weaknessScore * 100)}% weak
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {topic.total} attempts
                          </p>
                          <Button size="sm" variant="outline" className="w-full" onClick={() => handlePracticeWeakTopic(topic.id)}>
                            <Target className="h-3 w-3 mr-1" />Practice This Topic
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {data.recentActivity.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.occurredAt}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
