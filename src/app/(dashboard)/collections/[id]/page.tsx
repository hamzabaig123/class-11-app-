'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Play, MoreHorizontal, Pin, PinOff, Archive, Trash2, Edit2, GripVertical, X, Copy, Settings } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import { formatPercentage } from '@/lib/utils'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function CollectionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const collectionId = params.id as string

  const { data: collection, isLoading, refetch } = trpc.collections.get.useQuery({ id: collectionId })
  const removeQuestion = trpc.collections.removeQuestion.useMutation({
    onSuccess: () => { refetch(); toast({ title: 'Question removed' }) },
  })
  const startPractice = trpc.collections.startPractice.useMutation({
    onSuccess: (session) => { router.push(`/practice/${session.sessionId}`) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })
  const togglePin = trpc.collections.togglePinned.useMutation({ onSuccess: () => refetch() })

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <h2 className="text-xl font-semibold">Collection not found</h2>
        <Link href="/collections"><Button className="mt-4" variant="outline">Back to Collections</Button></Link>
      </div>
    )
  }

  const questionList = collection.questions ?? []
  const accuracy = collection.accuracy
  const attemptedCount = collection.attemptedCount ?? 0
  const masteredCount = collection.masteredCount ?? 0
  const totalQuestions = collection._count?.questions ?? questionList.length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/collections" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Collections
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-3 h-12 rounded" style={{ backgroundColor: collection.color || '#8B1A2B' }} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{collection.name}</h1>
                {collection.isPinned && <Pin className="h-4 w-4 text-burgundy-600" />}
              </div>
              {collection.description && <p className="text-muted-foreground mt-1">{collection.description}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => startPractice.mutate({ collectionId, count: 10 })} disabled={questionList.length === 0}>
              <Play className="h-4 w-4 mr-2" />Practice
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => togglePin.mutate({ id: collection.id })}>
                  {collection.isPinned ? <><PinOff className="h-4 w-4 mr-2" />Unpin</> : <><Pin className="h-4 w-4 mr-2" />Pin</>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: 'Edit coming soon' })}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalQuestions}</p>
            <p className="text-sm text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{attemptedCount}</p>
            <p className="text-sm text-muted-foreground">Attempted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{masteredCount}</p>
            <p className="text-sm text-muted-foreground">Mastered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{accuracy !== null ? `${Math.round(accuracy)}%` : '—'}</p>
            <p className="text-sm text-muted-foreground">Accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Question List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Questions ({totalQuestions})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {questionList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No questions in this collection yet</p>
              <Link href="/questions">
                <Button className="mt-3" variant="outline" size="sm">Browse Question Library</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {questionList.map((cq: any, index: number) => {
                const q = cq.question
                return (
                  <div key={cq.questionId} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 group">
                    <span className="text-muted-foreground text-sm font-mono mt-1 shrink-0">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {q.subject && <Badge variant="secondary" className="text-xs">{q.subject.name}</Badge>}
                        {q.topic && <Badge variant="outline" className="text-xs">{q.topic.name}</Badge>}
                        <Badge variant={q.difficulty === 'EASY' ? 'default' : q.difficulty === 'HARD' ? 'destructive' : 'secondary'} className="text-xs">
                          {q.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeQuestion.mutate({ collectionId, questionId: cq.questionId })}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}