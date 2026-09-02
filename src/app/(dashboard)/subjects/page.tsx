'use client'

import { useState } from 'react'
import { Plus, BookOpen, FileText, Archive, MoreHorizontal, Pencil, Trash2, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function SubjectsPage() {
  const { data: subjects, isLoading } = trpc.subjects.list.useQuery({ includeArchived: true })
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const filteredSubjects = subjects?.filter(s => {
    if (!showArchived && s.status === 'ARCHIVED') return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const archiveMutation = trpc.subjects.archive.useMutation()
  const restoreMutation = trpc.subjects.restore.useMutation()
  const deleteMutation = trpc.subjects.delete.useMutation()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage your syllabus hierarchy — subjects, chapters, and sources.
          </p>
        </div>
        <Button asChild>
          <Link href="/subjects/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Subject
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Filter</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4 mr-1" />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

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
      ) : filteredSubjects && filteredSubjects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map(subject => (
            <Card
              key={subject.id}
              className={`hover:shadow-md transition-shadow ${subject.status === 'ARCHIVED' ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: subject.color || '#6b7280' }}
                    >
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <Link href={`/subjects/${subject.id}`} className="font-semibold hover:text-burgundy-600">
                        {subject.name}
                      </Link>
                      {subject.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{subject.description}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/subjects/${subject.id}/edit`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {subject.status === 'ARCHIVED' ? (
                        <DropdownMenuItem onClick={() => restoreMutation.mutate({ id: subject.id })}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => archiveMutation.mutate({ id: subject.id })}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          if (confirm(`Delete "${subject.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate({ id: subject.id, permanent: true, confirmationName: subject.name })
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{subject._count.questions} questions</span>
                  <span>{subject._count.chapters} chapters</span>
                  <span>{subject._count.sources} sources</span>
                </div>
                {subject.status === 'ARCHIVED' && (
                  <Badge variant="outline" className="text-xs text-orange-600">Archived</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium">No subjects found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? 'Try a different search term.' : 'Create your first subject to get started.'}
            </p>
            {!search && (
              <Button asChild className="mt-4">
                <Link href="/subjects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Subject
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
