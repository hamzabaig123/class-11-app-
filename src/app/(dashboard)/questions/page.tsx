'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, Search, Filter, Download, Upload, Archive, Trash2, MoreHorizontal, CheckSquare, Square, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import { formatTimeAgo, getDifficultyColor } from '@/lib/utils'
import Link from 'next/link'

export default function QuestionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [subjectFilter, setSubjectFilter] = useState<string | null>(searchParams.get('subjectId'))
  const [chapterFilter, setChapterFilter] = useState<string | null>(searchParams.get('chapterId'))
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status'))
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(searchParams.get('difficulty'))
  const [sort, setSort] = useState(searchParams.get('sort') || 'updated')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  const pageSize = 20

  const { data, isLoading, refetch } = trpc.questions.list.useQuery({
    search: search || undefined,
    subjectId: subjectFilter || undefined,
    chapterId: chapterFilter || undefined,
    status: statusFilter || undefined,
    difficulty: difficultyFilter || undefined,
    sort,
    page,
    pageSize,
  })

  const { data: subjects } = trpc.subjects.list.useQuery({ includeArchived: false })
  const { data: chapters } = trpc.chapters.list.useQuery({
    subjectId: subjectFilter || '',
    includeArchived: false,
  }, { enabled: !!subjectFilter })

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (subjectFilter) params.set('subjectId', subjectFilter)
    if (chapterFilter) params.set('chapterId', chapterFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (difficultyFilter) params.set('difficulty', difficultyFilter)
    if (sort !== 'updated') params.set('sort', sort)
    if (page > 1) params.set('page', page.toString())
    router.replace(`/questions?${params.toString()}`)
  }, [search, subjectFilter, chapterFilter, statusFilter, difficultyFilter, sort, page, router])

  // Reset chapter filter when subject changes
  useEffect(() => {
    setChapterFilter(null)
  }, [subjectFilter])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data?.questions) return
    if (selectedIds.size === data.questions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.questions.map(q => q.id)))
    }
  }

  const bulkArchive = trpc.questions.bulkUpdate.useMutation({
    onSuccess: () => {
      refetch()
      setSelectedIds(new Set())
    },
  })

  const bulkDelete = trpc.questions.bulkUpdate.useMutation({
    onSuccess: () => {
      refetch()
      setSelectedIds(new Set())
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Question Library</h1>
          <p className="text-muted-foreground">
            Manage your MCQ collection. Add, organize, and review questions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/questions/new">
              <Plus className="h-4 w-4 mr-2" />
              Add MCQ
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ai-studio">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Status: {statusFilter || 'All'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('DRAFT')}>Draft</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('PUBLISHED')}>Published</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('ARCHIVED')}>Archived</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('FLAGGED')}>Flagged</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Difficulty: {difficultyFilter || 'All'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setDifficultyFilter(null)}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficultyFilter('EASY')}>Easy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficultyFilter('MEDIUM')}>Medium</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficultyFilter('HARD')}>Hard</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Sort: {sort}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSort('updated')}>Recently Updated</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('newest')}>Newest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('oldest')}>Oldest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('difficulty')}>Difficulty</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('attempts')}>Most Attempted</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Subject: {subjectFilter ? subjects?.find(s => s.id === subjectFilter)?.name : 'All'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSubjectFilter(null)} className="font-medium">
                  All Subjects
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {subjects?.map(subject => (
                  <DropdownMenuItem
                    key={subject.id}
                    onClick={() => setSubjectFilter(subject.id)}
                    className={subjectFilter === subject.id ? 'bg-burgundy-50' : ''}
                  >
                    {subject.name} ({subject._count.questions})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {subjectFilter && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Chapter: {chapterFilter ? chapters?.find(c => c.id === chapterFilter)?.name : 'All'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setChapterFilter(null)} className="font-medium">
                    All Chapters
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {chapters?.map(chapter => (
                    <DropdownMenuItem
                      key={chapter.id}
                      onClick={() => setChapterFilter(chapter.id)}
                      className={chapterFilter === chapter.id ? 'bg-burgundy-50' : ''}
                    >
                      {chapter.name} ({chapter._count.questions})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="bg-burgundy-50 border-burgundy-200">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkArchive.mutate({ ids: Array.from(selectedIds), action: 'archive' })}
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkDelete.mutate({ ids: Array.from(selectedIds), action: 'delete' })}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-16 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-full bg-burgundy-100 flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-burgundy-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No questions yet</h3>
                <p className="text-muted-foreground">
                  {search || subjectFilter || statusFilter || difficultyFilter
                    ? 'No questions match your filters.'
                    : 'Start building your question library.'}
                </p>
              </div>
              <Button asChild size="lg">
                <Link href="/questions/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first MCQ
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center gap-2 px-1">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              {selectedIds.size === data?.questions.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Select All
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.questions.map(question => (
              <Card
                key={question.id}
                className={`hover:shadow-md transition-shadow ${selectedIds.has(question.id) ? 'ring-2 ring-burgundy-500' : ''}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <button onClick={() => toggleSelect(question.id)} className="mt-1">
                      {selectedIds.has(question.id) ? (
                        <CheckSquare className="h-4 w-4 text-burgundy-600" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-2">{question.text}</p>
                    </div>
                    <Badge variant={question.difficulty === 'EASY' ? 'success' : question.difficulty === 'MEDIUM' ? 'warning' : 'destructive'}>
                      {question.difficulty}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {question.subject && (
                      <Badge variant="secondary">{question.subject.name}</Badge>
                    )}
                    {question.chapter && (
                      <Badge variant="outline">{question.chapter.name}</Badge>
                    )}
                    {question.tags.slice(0, 2).map(tag => (
                      <Badge key={tag.id} variant="outline" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                    {question.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{question.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{question._count.attempts} attempts</span>
                    <span>{formatTimeAgo(question.updatedAt)}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" size="sm" asChild className="flex-1">
                      <Link href={`/questions/${question.id}`}>View</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="flex-1">
                      <Link href={`/questions/${question.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
