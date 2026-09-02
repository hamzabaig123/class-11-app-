'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Archive, Trash2, Copy, History, BookOpen, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { formatTimeAgo } from '@/lib/utils'
import Link from 'next/link'

export default function QuestionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const questionId = params.questionId as string
  const { data: question, isLoading } = trpc.questions.get.useQuery({ id: questionId })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const archiveMutation = trpc.questions.archive.useMutation({
    onSuccess: () => router.push('/questions'),
  })

  const deleteMutation = trpc.questions.delete.useMutation({
    onSuccess: () => router.push('/questions'),
  })

  const duplicateMutation = trpc.questions.duplicate.useMutation({
    onSuccess: () => router.push('/questions'),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Question not found</h2>
        <Button asChild className="mt-4">
          <Link href="/questions">Back to Questions</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Question Details</h1>
            <p className="text-muted-foreground text-sm">
              Created {formatTimeAgo(question.createdAt)} • Last updated {formatTimeAgo(question.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => duplicateMutation.mutate({ id: question.id })}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/questions/${question.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Question Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant={question.difficulty === 'EASY' ? 'success' : question.difficulty === 'MEDIUM' ? 'warning' : 'destructive'}>
              {question.difficulty}
            </Badge>
            <Badge variant="outline">{question.status}</Badge>
            {question.subject && <Badge variant="secondary">{question.subject.name}</Badge>}
            {question.chapter && <Badge variant="outline">{question.chapter.name}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium">{question.text}</p>

          <div className="space-y-2">
            {question.options.map(option => (
              <div
                key={option.label}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  question.answer?.correctLabel === option.label
                    ? 'bg-green-50 border-green-200'
                    : 'bg-muted/30'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded font-medium ${
                  question.answer?.correctLabel === option.label
                    ? 'bg-green-600 text-white'
                    : 'bg-burgundy-100 text-burgundy-700'
                }`}>
                  {option.label}
                </div>
                <span className="flex-1">{option.text}</span>
                {question.answer?.correctLabel === option.label && (
                  <Badge variant="success" className="text-xs">Correct</Badge>
                )}
              </div>
            ))}
          </div>

          {question.explanation && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-1">Explanation</h4>
              <p className="text-sm text-blue-700">{question.explanation}</p>
            </div>
          )}

          {question.hint && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-1">Hint</h4>
              <p className="text-sm text-yellow-700">{question.hint}</p>
            </div>
          )}

          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {question.tags.map(tag => (
                <Badge key={tag.id} variant="outline" className="text-xs">{tag.name}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source Links */}
      {question.questionSources && question.questionSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Source Evidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {question.questionSources.map(link => (
                <Link key={link.sourceId} href={`/sources/${link.sourceId}`} className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{link.source.title}</span>
                  {link.pageNumber && <Badge variant="outline" className="text-xs">p. {link.pageNumber}</Badge>}
                  {link.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Learning History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{question._count.attempts}</div>
              <div className="text-sm text-muted-foreground">Attempts</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{question._count.reviewItems}</div>
              <div className="text-sm text-muted-foreground">Review Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{question._count.bookmarks}</div>
              <div className="text-sm text-muted-foreground">Bookmarks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Archive to hide from practice, or delete permanently.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => archiveMutation.mutate({ id: question.id })}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-2">Delete Question?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete this question. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: question.id, permanent: true })}>
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
