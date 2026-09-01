'use client'

import { useCallback } from 'react'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from './DashboardHeader'
import { QuickActions } from './QuickActions'
import { ProgressMetrics } from './ProgressMetrics'
import { EmptyWorkspaceCard } from './EmptyWorkspaceCard'
import { RecentActivityCard } from './RecentActivityCard'
import { SyllabusCard } from './SyllabusCard'
import { DashboardSkeleton } from './DashboardSkeleton'
import { DashboardErrorState } from './DashboardErrorState'

export function DashboardPage() {
  const router = useRouter()
  const { data, isLoading, isError, error, refetch } = trpc.dashboard.summary.useQuery()

  const handleAddQuestion = useCallback(() => {
    router.push('/questions/create')
  }, [router])

  const handleOpenLibrary = useCallback(() => {
    router.push('/questions')
  }, [router])

  const handleCreateSubject = useCallback(() => {
    router.push('/questions/create')
  }, [router])

  const handleImportQuestions = useCallback(() => {
    router.push('/ai-studio')
  }, [router])

  const handleViewMastered = useCallback(() => {
    router.push('/revision?status=mastered')
  }, [router])

  const handleViewAnalytics = useCallback(() => {
    router.push('/analytics')
  }, [router])

  const handleStartRevision = useCallback(() => {
    router.push('/revision')
  }, [router])

  const handleViewStreak = useCallback(() => {
    router.push('/analytics')
  }, [router])

  const handleViewSubject = useCallback((subjectId: string) => {
    router.push(`/subjects/${subjectId}`)
  }, [router])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError) {
    return (
      <DashboardErrorState
        message={error?.message}
        onRetry={() => refetch()}
      />
    )
  }

  if (!data) {
    return <DashboardSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <DashboardHeader
        user={data.user}
        studyBrief={data.onboardingComplete 
          ? data.dueTodayCount > 0
            ? `You have ${data.dueTodayCount} question${data.dueTodayCount !== 1 ? 's' : ''} due today. ${data.accuracy !== null ? `Your current accuracy is ${Math.round(data.accuracy)}%.` : ''} Keep it up!`
            : data.questionCount > 0
              ? `All caught up! You have ${data.questionCount} question${data.questionCount !== 1 ? 's' : ''} in your library. ${data.masteredCount > 0 ? `${data.masteredCount} mastered so far.` : ''} Add more or take a practice session.`
              : 'Your revision space. Build your edge, one question at a time. A calm, focused place to add your own MCQs and discover what comes next.'
          : 'Your revision space. Build your edge, one question at a time. A calm, focused place to add your own MCQs and discover what comes next.'
        }
      />

      <QuickActions
        questionCount={data.questionCount}
        onAddQuestion={handleAddQuestion}
      />

      <ProgressMetrics
        masteredCount={data.masteredCount}
        accuracy={data.accuracy}
        dueTodayCount={data.dueTodayCount}
        studyStreakDays={data.studyStreakDays}
        questionCount={data.questionCount}
        attemptedCount={data.attemptedCount}
        onViewMastered={handleViewMastered}
        onViewAnalytics={handleViewAnalytics}
        onStartRevision={handleStartRevision}
        onViewStreak={handleViewStreak}
      />

      <EmptyWorkspaceCard
        questionCount={data.questionCount}
        onOpenLibrary={handleOpenLibrary}
        onCreateSubject={handleCreateSubject}
        onAddQuestion={handleAddQuestion}
        onImportQuestions={handleImportQuestions}
      />

      <RecentActivityCard
        activities={data.recentActivity}
      />

      <SyllabusCard
        subjects={data.subjects}
        onAddSubject={handleCreateSubject}
      />
    </div>
  )
}