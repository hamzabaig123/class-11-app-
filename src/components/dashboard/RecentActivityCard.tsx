'use client'

import { Clock, CheckCircle, BookOpen, RotateCcw, Plus, Upload, FolderPlus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTimeAgo } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ActivityEvent {
  id: string
  type: string
  title: string
  occurredAt: string
  entityId: string | null
}

interface RecentActivityCardProps {
  activities: ActivityEvent[]
  loading?: boolean
}

const activityIcons: Record<string, React.ReactNode> = {
  QUESTION_CREATED: <Plus className="h-4 w-4 text-green-600" />,
  QUESTION_ANSWERED: <CheckCircle className="h-4 w-4 text-blue-600" />,
  SESSION_STARTED: <BookOpen className="h-4 w-4 text-purple-600" />,
  SESSION_COMPLETED: <CheckCircle className="h-4 w-4 text-green-600" />,
  SESSION_ABANDONED: <RotateCcw className="h-4 w-4 text-orange-600" />,
  REVIEW_COMPLETED: <RotateCcw className="h-4 w-4 text-indigo-600" />,
  SUBJECT_CREATED: <FolderPlus className="h-4 w-4 text-burgundy-600" />,
  TOPIC_CREATED: <BookOpen className="h-4 w-4 text-burgundy-600" />,
  IMPORT_STARTED: <Upload className="h-4 w-4 text-cyan-600" />,
  IMPORT_COMPLETED: <CheckCircle className="h-4 w-4 text-cyan-600" />,
  IMPORT_APPROVED: <CheckCircle className="h-4 w-4 text-green-600" />,
  MASTERY_ACHIEVED: <CheckCircle className="h-4 w-4 text-purple-600" />,
}

const activityLabels: Record<string, string> = {
  QUESTION_CREATED: 'Question created',
  QUESTION_ANSWERED: 'Question answered',
  SESSION_STARTED: 'Session started',
  SESSION_COMPLETED: 'Session completed',
  SESSION_ABANDONED: 'Session abandoned',
  REVIEW_COMPLETED: 'Review completed',
  SUBJECT_CREATED: 'Subject created',
  TOPIC_CREATED: 'Topic created',
  IMPORT_STARTED: 'Import started',
  IMPORT_COMPLETED: 'Import completed',
  IMPORT_APPROVED: 'Import approved',
  MASTERY_ACHIEVED: 'Mastery achieved',
}

export function RecentActivityCard({ activities, loading }: RecentActivityCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">Your learning trail</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Answered questions, revision sessions, and study time will appear here after you begin.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button size="sm" asChild>
                <Link href="/revision">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Practice
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/questions/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add MCQ
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start gap-3 group"
              onClick={() => activity.entityId && console.log('Navigate to', activity.entityId)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {activityIcons[activity.type] || <Clock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {activityLabels[activity.type] || activity.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.occurredAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t text-center">
          <Link href="/activity" className="text-sm text-burgundy-600 hover:underline">
            View all activity →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}