'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, Bookmark, BookmarkCheck, ChevronDown, ChevronRight, Star, Flag, Eye, EyeOff, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function QALibraryPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [questionType, setQuestionType] = useState<'all' | 'MCQ' | 'SHORT' | 'LONG'>('all')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'updated' | 'difficulty' | 'marks'>('updated')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pageSize = 10

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Reset chapter when subject changes
  useEffect(() => {
    setSelectedChapterId(null)
  }, [selectedSubjectId])

  const { data: subjects } = trpc.subjects.list.useQuery({ includeArchived: false })
  const { data: chapters } = trpc.chapters.list.useQuery(
    { subjectId: selectedSubjectId || '', includeArchived: false },
    { enabled: !!selectedSubjectId }
  )

  const { data, isLoading } = trpc.qa.list.useQuery({
    search: debouncedQuery || undefined,
    subjectId: selectedSubjectId || undefined,
    chapterId: selectedChapterId || undefined,
    questionType: questionType === 'all' ? undefined : questionType,
    sort,
    page,
    pageSize,
  })

  const { data: bookmarks } = trpc.qa.bookmarks.useQuery({ page: 1, pageSize: 100 })
  const bookmarkedIds = new Set(bookmarks?.bookmarks?.map(b => b.questionId) || [])

  const toggleBookmark = trpc.qa.toggleBookmark.useMutation({
    onSuccess: () => {
      // Optimistic update would go here
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Q&A Library</h1>
          <p className="text-muted-foreground">Browse short answers, long answers, and model solutions</p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Subject: {selectedSubjectId ? subjects?.find(s => s.id === selectedSubjectId)?.name : 'All'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedSubjectId(null)}>All Subjects</DropdownMenuItem>
                {subjects?.map(s => (
                  <DropdownMenuItem key={s.id} onClick={() => setSelectedSubjectId(s.id)}>{s.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedSubjectId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Chapter: {selectedChapterId ? chapters?.find(c => c.id === selectedChapterId)?.name : 'All'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedChapterId(null)}>All Chapters</DropdownMenuItem>
                  {chapters?.map(c => (
                    <DropdownMenuItem key={c.id} onClick={() => setSelectedChapterId(c.id)}>{c.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Type: {questionType === 'all' ? 'All' : questionType}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setQuestionType('all')}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuestionType('MCQ')}>MCQ</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuestionType('SHORT')}>Short Answer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuestionType('LONG')}>Long Answer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Sort: {sort}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSort('updated')}>Recently Updated</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('newest')}>Newest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('oldest')}>Oldest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('difficulty')}>Difficulty</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('marks')}>Marks</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Question List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : data?.questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium">No questions found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {query ? 'Try a different search term.' : 'Start building your Q&A library.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.questions.map(question => (
            <QuestionCard
              key={question.id}
              question={question}
              expanded={expandedId === question.id}
              onToggle={() => setExpandedId(expandedId === question.id ? null : question.id)}
              bookmarked={bookmarkedIds.has(question.id)}
              onBookmark={() => toggleBookmark.mutate({ questionId: question.id })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm py-1">Page {page} of {data.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface QuestionCardProps {
  question: any
  expanded: boolean
  onToggle: () => void
  bookmarked: boolean
  onBookmark: () => void
}

function QuestionCard({ question, expanded, onToggle, bookmarked, onBookmark }: QuestionCardProps) {
  const router = useRouter()
  const [showReport, setShowReport] = useState(false)
  const [reportCategory, setReportCategory] = useState<string>('incorrect')
  const [reportDescription, setReportDescription] = useState('')

  const reportMutation = trpc.qa.report.useMutation({
    onSuccess: () => {
      setShowReport(false)
      setReportDescription('')
    },
  })

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm line-clamp-2">{question.text}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {question.subject && (
                <Badge variant="secondary" className="text-xs" style={{ backgroundColor: question.subject.color || undefined }}>
                  {question.subject.name}
                </Badge>
              )}
              {question.chapter && <Badge variant="outline" className="text-xs">{question.chapter.name}</Badge>}
              <Badge variant={question.questionType === 'MCQ' ? 'default' : question.questionType === 'SHORT' ? 'secondary' : 'outline'} className="text-xs">
                {question.questionType}
              </Badge>
              <Badge variant="outline" className="text-xs">{question.difficulty}</Badge>
              {question.marks && <Badge variant="outline" className="text-xs">{question.marks} marks</Badge>}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onBookmark} className="p-1.5 hover:bg-accent rounded" title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}>
              {bookmarked ? <BookmarkCheck className="h-4 w-4 text-burgundy-600" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
            </button>
            <button onClick={() => setShowReport(!showReport)} className="p-1.5 hover:bg-accent rounded" title="Report issue">
              <Flag className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Report Form */}
        {showReport && (
          <div className="p-3 bg-muted rounded space-y-2">
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
              rows={2}
            />
            <Button
              size="sm"
              onClick={() => reportMutation.mutate({ questionId: question.id, category: reportCategory as any, description: reportDescription })}
              disabled={reportMutation.isPending || reportDescription.length < 10}
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        )}

        {/* Expand/Collapse */}
        <button onClick={onToggle} className="flex items-center gap-1 text-sm text-burgundy-600 hover:underline">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {expanded ? 'Hide Answer' : 'Show Answer'}
        </button>

        {/* Answer Content */}
        {expanded && (
          <div className="p-4 bg-muted/50 rounded space-y-3">
            {/* MCQ Answer */}
            {question.questionType === 'MCQ' && question.answer && (
              <div>
                <p className="text-sm font-medium">Correct Answer: {question.answer.correctLabel}</p>
                {question.answer.explanation && (
                  <p className="text-sm text-muted-foreground mt-1">{question.answer.explanation}</p>
                )}
              </div>
            )}

            {/* Long-form Answer */}
            {question.answerContent && (
              <div>
                <p className="text-sm font-medium mb-1">Model Answer:</p>
                <div className="text-sm whitespace-pre-wrap">{question.answerContent.content}</div>
                {question.answerContent.keyPoints && (
                  <div className="mt-2">
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

            {/* Meta info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
              <span>{question._count?.attempts || 0} attempts</span>
              <span>{question._count?.bookmarks || 0} bookmarks</span>
              {question.year && <span>Year: {question.year}</span>}
              {question.examLabel && <span>Exam: {question.examLabel}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
