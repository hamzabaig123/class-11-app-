'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, BookOpen, FileText, Archive, MoreHorizontal, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function ChapterPage() {
  const params = useParams()
  const chapterId = params.chapterId as string
  const { data: chapter, isLoading } = trpc.chapters.get.useQuery({ id: chapterId })
  const [showCreateQuestion, setShowCreateQuestion] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Chapter not found</h2>
        <p className="text-muted-foreground mt-2">This chapter may have been deleted or you don't have access.</p>
        <Button asChild className="mt-4">
          <Link href="/subjects">Back to Subjects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-burgundy-100 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-burgundy-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{chapter.name}</h1>
            {chapter.description && (
              <p className="text-muted-foreground text-sm">{chapter.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                Ch. {chapter.chapterNo || '—'}
              </Badge>
              <Link href={`/subjects/${chapter.subjectId}`} className="text-sm text-muted-foreground hover:text-foreground">
                {chapter.subject.name}
              </Link>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/questions/new?chapterId=${chapterId}`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Chapter
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-orange-600">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{chapter._count.questions}</div>
            <div className="text-sm text-muted-foreground">Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{chapter._count.sources}</div>
            <div className="text-sm text-muted-foreground">Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {chapter.sources.length}
            </div>
            <div className="text-sm text-muted-foreground">Source Documents</div>
          </CardContent>
        </Card>
      </div>

      {/* Questions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Questions</h2>
        {chapter._count.questions === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium">No questions yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Add your first question to this chapter.
              </p>
              <Button className="mt-4" asChild>
                <Link href={`/questions/new?chapterId=${chapterId}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {/* Question list will be loaded here */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Questions will appear here</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Sources */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Sources</h2>
        {chapter.sources.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium">No sources yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Add a source document to link with questions.
              </p>
              <Button className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {chapter.sources.map(source => (
              <Link key={source.id} href={`/sources/${source.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{source.title}</h3>
                        <p className="text-sm text-muted-foreground">{source.sourceType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{source.year || '—'}</span>
                      <span>{source.author || 'Unknown author'}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
