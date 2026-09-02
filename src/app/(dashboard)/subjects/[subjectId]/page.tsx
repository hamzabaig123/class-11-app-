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

export default function SubjectPage() {
  const params = useParams()
  const subjectId = params.subjectId as string
  const { data: subject, isLoading } = trpc.subjects.get.useQuery({ id: subjectId })
  const [showCreateChapter, setShowCreateChapter] = useState(false)

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

  if (!subject) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Subject not found</h2>
        <p className="text-muted-foreground mt-2">This subject may have been deleted or you don't have access.</p>
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
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: subject.color || '#6b7280' }}
          >
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{subject.name}</h1>
            {subject.description && (
              <p className="text-muted-foreground text-sm">{subject.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateChapter(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Chapter
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
                Edit Subject
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{subject._count.questions}</div>
            <div className="text-sm text-muted-foreground">Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{subject._count.chapters}</div>
            <div className="text-sm text-muted-foreground">Chapters</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{subject._count.sources}</div>
            <div className="text-sm text-muted-foreground">Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {subject.chapters.reduce((sum, c) => sum + c._count.questions, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Chapter Questions</div>
          </CardContent>
        </Card>
      </div>

      {/* Chapters */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Chapters</h2>
        {subject.chapters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium">No chapters yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Add your first chapter to start organizing questions.
              </p>
              <Button className="mt-4" onClick={() => setShowCreateChapter(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Chapter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {subject.chapters.map(chapter => (
              <Link key={chapter.id} href={`/chapters/${chapter.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {chapter.chapterNo && (
                            <Badge variant="outline" className="text-xs">
                              Ch. {chapter.chapterNo}
                            </Badge>
                          )}
                          <h3 className="font-semibold">{chapter.name}</h3>
                        </div>
                        {chapter.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {chapter.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{chapter._count.questions} questions</span>
                      <span>{chapter._count.sources} sources</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Chapter Dialog */}
      {showCreateChapter && (
        <CreateChapterDialog
          subjectId={subjectId}
          onClose={() => setShowCreateChapter(false)}
        />
      )}
    </div>
  )
}

function CreateChapterDialog({ subjectId, onClose }: { subjectId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [chapterNo, setChapterNo] = useState('')
  const [description, setDescription] = useState('')
  const utils = trpc.useUtils()

  const createMutation = trpc.chapters.create.useMutation({
    onSuccess: () => {
      utils.subjects.get.invalidate({ id: subjectId })
      onClose()
      setName('')
      setChapterNo('')
      setDescription('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({
      subjectId,
      name: name.trim(),
      chapterNo: chapterNo.trim() || undefined,
      description: description.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Create Chapter</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
              placeholder="e.g., Cell Biology"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Chapter Number</label>
            <input
              type="text"
              value={chapterNo}
              onChange={(e) => setChapterNo(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
              placeholder="e.g., 1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
