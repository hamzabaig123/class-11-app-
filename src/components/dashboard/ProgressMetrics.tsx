'use client'

import { BookCheck, Target, Clock, Flame } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { formatPercentage, formatDuration } from '@/lib/utils'
import Link from 'next/link'

interface ProgressMetricsProps {
  masteredCount: number
  accuracy: number | null
  dueTodayCount: number
  studyStreakDays: number
  questionCount: number
  attemptedCount: number
  onViewMastered: () => void
  onViewAnalytics: () => void
  onStartRevision: () => void
  onViewStreak: () => void
  loading?: boolean
}

export function ProgressMetrics({
  masteredCount,
  accuracy,
  dueTodayCount,
  studyStreakDays,
  questionCount,
  attemptedCount,
  onViewMastered,
  onViewAnalytics,
  onStartRevision,
  onViewStreak,
  loading,
}: ProgressMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <MetricCard
        title="Questions Mastered"
        value={masteredCount}
        icon={<BookCheck className="h-6 w-6" />}
        emptyText={questionCount === 0 ? 'Add MCQs to begin' : 'Keep practicing to master more'}
        onClick={onViewMastered}
        loading={loading}
      />
      <MetricCard
        title="Accuracy"
        value={formatPercentage(accuracy)}
        icon={<Target className="h-6 w-6" />}
        emptyText={attemptedCount === 0 ? 'No attempts yet' : 'Start practicing to track accuracy'}
        onClick={onViewAnalytics}
        loading={loading}
      />
      <MetricCard
        title="Due Today"
        value={dueTodayCount}
        icon={<Clock className="h-6 w-6" />}
        emptyText={dueTodayCount === 0 ? 'Your queue is clear' : 'Questions ready for review'}
        onClick={dueTodayCount > 0 ? onStartRevision : undefined}
        className={dueTodayCount > 0 ? 'ring-2 ring-burgundy-200' : ''}
        loading={loading}
      />
      <MetricCard
        title="Study Streak"
        value={`${studyStreakDays} days`}
        icon={<Flame className="h-6 w-6" />}
        emptyText={studyStreakDays === 0 ? 'Start your first session' : 'Keep the streak alive!'}
        onClick={onViewStreak}
        loading={loading}
      />
    </div>
  )
}