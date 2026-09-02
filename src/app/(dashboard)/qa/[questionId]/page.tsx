'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Bookmark, BookmarkCheck, Flag, Star, Eye, EyeOff, ChevronRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function QADetailPage() {
  const params = useParams()
  const router = useRouter()
  const questionId = params.questionId as string
  const [showAnswer, setShowAnswer] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportCategory, setReportCategory] = useState<string>('incorrect')
  const [reportDescription, setReportDescription] = useState('')

  const { data: question, isLoading } = trpc.qa.get.useQuery({ id: questionId })
  const { data: related } = trpc.qa.related.useQuery({ questionId })
  const { data: bookmarks } = trpc.qa.bookmarks.useQuery({ page: 1, pageSize: 100 })
  const bookmarkedIds = new Set(bookmarks?.bookmarks?.map(b => b.questionId) || [])

  const toggleBookmark = trpc.qa.toggleBookmark.useMutation()
  const reportMutation = trpc.qa.report.useMutation({
    onSuccess: () => {
      setShowReport(false)
      setReportDescription('')
    },
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
          <Link href="/qa">Back to Q&A Library</Link>
        </Button>
      </div>
    )
  }

  const isBookmarked = bookmarkedIds.has(question.id)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Question Detail</h1>
          <div className="flex items-center gap-2 mt-1">
            {question.subject && (
              <Badge variant="secondary" style={{ backgroundColor: question.subject.color || undefined }}>
                {question.subject.name}
              </Badge>
            )}
            {question.chapter && <Badge variant="outline">{question.chapter.name}</Badge>}
            <Badge variant={question.questionType === 'MCQ' ? 'default' : question.questionType === 'SHORT' ? 'secondary' : 'outline'}>
              {question.questionType}
            </Badge>
            <Badge variant="outline">{question.difficulty}</Badge>
            {question.marks && <Badge variant="outline">{question.marks} marks</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toggleBookmark.mutate({ questionId: question.id })}>
            {isBookmarked ? <BookmarkCheck className="h-4 w-4 mr-2 text-burgundy-600" /> : <Bookmark className="h-4 w-4 mr-2" />}
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          <Button variant="outline" onClick={() => setShowReport(!showReport)}>
            <Flag className="h-4 w-4 mr-2" />
            Report
          </Button>
        </div>
      </div>

      {/* Report Form */}
      {showReport && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium">Report an Issue</h3>
            <div className="flex gap-2">
              {['incorrect', 'unclear', 'duplicate', 'misclassified', 'other'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setReportCategory(cat)}
                  className={`text-xs px-2 py-1 rounded ${reportCategory === cat ? 'bg-burgundy-600 text-white' : 'bg-background border'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full p-2 border rounded text-sm"
              rows={3}
            />
            <Button
              size="sm"
              onClick={() => reportMutation.mutate({ questionId: question.id, category: reportCategory as any, description: reportDescription })}
              disabled={reportMutation.isPending || reportDescription.length < 10}
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Question */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg font-medium">{question.text}</p>

          {/* MCQ Options */}
          {question.questionType === 'MCQ' && question.options && question.options.length > 0 && (
            <div className="space-y-2">
              {question.options.map((option: any) => (
                <div
                  key={option.label}
                  className={`p-3 rounded-lg border ${
                    showAnswer && question.answer?.correctLabel === option.label
                      ? 'bg-green-50 border-green-200'
                      : 'bg-muted/30'
                  }`}
                >
                  <span className="font-medium mr-2">{option.label}.</span>
                  {option.text}
                  {showAnswer && question.answer?.correctLabel === option.label && (
                    <Badge variant="success" className="ml-2 text-xs">Correct</Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Show/Hide Answer */}
          <Button onClick={() => setShowAnswer(!showAnswer)}>
            {showAnswer ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </Button>

          {/* Answer Content */}
          {showAnswer && (
            <div className="p-4 bg-muted/50 rounded space-y-4">
              {/* MCQ Explanation */}
              {question.questionType === 'MCQ' && question.answer?.explanation && (
                <div>
                  <p className="text-sm font-medium mb-1">Explanation:</p>
                  <p className="text-sm">{question.answer.explanation}</p>
                </div>
              )}

              {/* Long-form Answer */}
              {question.answerContent && (
                <div>
                  <p className="text-sm font-medium mb-1">Model Answer:</p>
                  <div className="text-sm whitespace-pre-wrap">{question.answerContent.content}</div>
                  {question.answerContent.keyPoints && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1">Key Points:</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {JSON.parse(question.answerContent.keyPoints || '[]').map((point: string, i: number) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Generic Explanation */}
              {question.explanation && !question.answerContent && !question.answer && (
                <div>
                  <p className="text-sm font-medium mb-1">Explanation:</p>
                  <p className="text-sm whitespace-pre-wrap">{question.explanation}</p>
                </div>
              )}

              {/* Marking Points */}
              {question.markingPoints && question.markingPoints.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Marking Scheme:</p>
                  <ul className="space-y-1">
                    {question.markingPoints.map((mp: any) => (
                      <li key={mp.id} className="text-sm flex items-center gap-2">
                        <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border">{mp.marks || 0} marks</span>
                        <span>{mp.pointText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Questions */}
      {related && related.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Related Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {related.map((q: any) => (
              <Link key={q.id} href={`/qa/${q.id}`}>
                <div className="p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{q.questionType}</Badge>
                    <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Meta Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{question._count?.attempts || 0} attempts</span>
            <span>{question._count?.bookmarks || 0} bookmarks</span>
            {question.year && <span>Year: {question.year}</span>}
            {question.examLabel && <span>Exam: {question.examLabel}</span>}
            {question.estimatedMinutes && <span>Est. time: {question.estimatedMinutes} min</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
