'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import { formatTimeAgo, getDifficultyColor } from '@/lib/utils'
import Link from 'next/link'

export default function QuestionsPage() {
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null)
  const { data, isLoading, refetch } = trpc.questions.list.useQuery({
    search: search || undefined,
    subjectId: subjectFilter || undefined,
  })
  const { data: subjects } = trpc.subjects.list.useQuery()

  const createQuestion = trpc.questions.create.useMutation({
    onSuccess: () => refetch(),
  })

  const handleCreateSample = () => {
    createQuestion.mutate({
      text: 'What is the capital of France?',
      options: [
        { label: 'A', text: 'London' },
        { label: 'B', text: 'Paris' },
        { label: 'C', text: 'Berlin' },
        { label: 'D', text: 'Madrid' },
      ],
      correctLabel: 'B',
      explanation: 'Paris is the capital and most populous city of France.',
      difficulty: 'EASY',
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="animate-pulse space-y-2">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
        </div>
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
      </div>
    )
  }

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Filters & Search</CardTitle>
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
                  <Filter className="h-4 w-4" />
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
          </div>
        </CardContent>
      </Card>

      {data?.questions.length === 0 || !data ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-full bg-burgundy-100 flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-burgundy-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No questions yet</h3>
                <p className="text-muted-foreground">
                  {search || subjectFilter
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.questions.map(question => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-2 flex-1">{question.text}</p>
                  <Badge variant={question.difficulty === 'EASY' ? 'success' : question.difficulty === 'MEDIUM' ? 'warning' : 'destructive'}>
                    {question.difficulty}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {question.subject && (
                    <Badge variant="secondary">{question.subject.name}</Badge>
                  )}
                  {question.topic && (
                    <Badge variant="outline">{question.topic.name}</Badge>
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
                  <span>{formatTimeAgo(question.createdAt)}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" size="sm" asChild className="flex-1">
                    <Link href={`/questions/${question.id}`}>Practice</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="flex-1">
                    <Link href={`/questions/${question.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination would go here */}
    </div>
  )
}