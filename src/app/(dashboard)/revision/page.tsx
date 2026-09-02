'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Clock, Filter, CheckCircle, AlertTriangle, Zap, BookOpen, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'

type FilterType = 'due' | 'overdue' | 'new' | 'learning' | 'review' | 'lapsed'

export default function RevisionPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('due')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const { data: dueItems, isLoading, refetch } = trpc.revision.dueQueue.useQuery()

  const filteredItems = useMemo(() => {
    if (!dueItems) return []
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    switch (filter) {
      case 'due': return dueItems.filter((i: any) => new Date(i.nextReviewAt) <= now)
      case 'overdue': return dueItems.filter((i: any) => new Date(i.nextReviewAt) < oneDayAgo)
      case 'new': return dueItems.filter((i: any) => i.status === 'NEW')
      case 'learning': return dueItems.filter((i: any) => i.status === 'LEARNING')
      case 'review': return dueItems.filter((i: any) => i.status === 'REVIEW')
      case 'lapsed': return dueItems.filter((i: any) => i.status === 'LAPSED')
      default: return dueItems
    }
  }, [dueItems, filter])

  const startSession = trpc.revision.startSession.useMutation({
    onSuccess: (data: any) => {
      toast({ title: 'Review session started' })
      router.push(`/practice/${data.sessionId}`)
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const handleStartReview = () => {
    const questionIds = filteredItems.map((i: any) => i.questionId)
    if (questionIds.length === 0) {
      toast({ title: 'No questions to review', description: 'All caught up!' })
      return
    }
    startSession.mutate({ questionIds, title: 'Due Review' })
  }

  const handleReviewSingle = (questionId: string) => {
    startSession.mutate({ questionIds: [questionId], title: 'Quick Review' })
  }

  const handleToggleSelect = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map((i: any) => i.id)))
    }
  }

  const handleStartSelected = () => {
    const questionIds = filteredItems
      .filter((i: any) => selectedItems.has(i.id))
      .map((i: any) => i.questionId)
    if (questionIds.length === 0) {
      toast({ title: 'No items selected', description: 'Select items to review' })
      return
    }
    startSession.mutate({ questionIds, title: 'Selected Review' })
  }

  const totalDue = dueItems?.length ?? 0
  const filterCount = filteredItems.length
  const selectedCount = selectedItems.size

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setFilter('due')}>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalDue}</p>
            <p className="text-xs text-muted-foreground">Due Now</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setFilter('new')}>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {dueItems?.filter((i: any) => i.status === 'NEW').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">New</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setFilter('learning')}>
          <CardContent className="p-4 text-center">
            <Brain className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {dueItems?.filter((i: any) => i.status === 'LEARNING').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Learning</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setFilter('lapsed')}>
          <CardContent className="p-4 text-center">
            <RotateCcw className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {dueItems?.filter((i: any) => i.status === 'LAPSED').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Lapsed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="due">Due Now</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="learning">Learning</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="lapsed">Lapsed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Button onClick={handleStartSelected} disabled={startSession.isPending}>
              <Zap className="h-4 w-4 mr-2" />
              Review Selected ({selectedCount})
            </Button>
          )}
        </div>
      </div>

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
            <Card
              key={item.id}
              className={`hover:shadow-sm transition-shadow ${
                selectedItems.has(item.id) ? 'ring-2 ring-burgundy-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleToggleSelect(item.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2">{item.question?.text || 'Loading...'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                      {item.question?.subject && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.question.subject.name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Next: {new Date(item.nextReviewAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Interval: {item.intervalDays} days
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReviewSingle(item.questionId)}
                    disabled={startSession.isPending}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    Review
                  </Button>
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
            {startSession.isPending ? 'Starting...' : `Start Review (${filterCount} questions)`}
          </Button>
        </div>
      )}
    </div>
  )
}
