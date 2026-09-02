'use client'

import { useState, useMemo } from 'react'
import { Brain, Clock, Filter, ChevronRight, CheckCircle, XCircle, AlertTriangle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function RevisionPage() {
  const [filter, setFilter] = useState<string>('due')
  const [reviewedCount, setReviewedCount] = useState(0)

  const { data: dueItems, isLoading, refetch } = trpc.revision.dueQueue.useQuery()

  const filteredItems = useMemo(() => {
    if (!dueItems) return []
    switch (filter) {
      case 'due': return dueItems.filter((i: any) => new Date(i.nextReviewAt) <= new Date())
      case 'overdue': return dueItems.filter((i: any) => new Date(i.nextReviewAt) < new Date(Date.now() - 24 * 60 * 60 * 1000))
      case 'new': return dueItems.filter((i: any) => i.status === 'NEW')
      case 'learning': return dueItems.filter((i: any) => i.status === 'LEARNING')
      case 'review': return dueItems.filter((i: any) => i.status === 'REVIEW')
      default: return dueItems
    }
  }, [dueItems, filter])

  const startSession = trpc.revision.startSession.useMutation({
    onSuccess: (session) => {
      toast({ title: 'Review session started' })
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const handleStartReview = () => {
    const questionIds = filteredItems.map((i: any) => i.questionId)
    startSession.mutate({ questionIds, title: 'Due Review', type: 'REVISION' })
  }

  const totalDue = dueItems?.length ?? 0
  const progress = totalDue > 0 ? (reviewedCount / totalDue) * 100 : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spaced Revision</h1>
          <p className="text-muted-foreground">Review questions at optimal intervals for long-term retention</p>
        </div>
        <div className="flex items-center gap-3">
          {totalDue > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 border border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">{totalDue} due</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="due">Due Now</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="learning">Learning</SelectItem>
            <SelectItem value="review">Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress */}
      {totalDue > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{reviewedCount} / {totalDue} reviewed</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-burgundy-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">All caught up!</h3>
            <p className="text-sm text-muted-foreground mt-1">No questions due for review right now</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item: any) => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.question?.text || 'Loading...'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                      <span>Next: {new Date(item.nextReviewAt).toLocaleDateString()}</span>
                      <span>Interval: {item.intervalDays} days</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Brain className="h-3 w-3 mr-1" />Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Start Review Button */}
      {filteredItems.length > 0 && (
        <div className="flex justify-center">
          <Button size="lg" onClick={handleStartReview} disabled={startSession.isPending}>
            <Zap className="h-5 w-5 mr-2" />
            {startSession.isPending ? 'Starting...' : `Start Review (${filteredItems.length} questions)`}
          </Button>
        </div>
      )}
    </div>
  )
}
