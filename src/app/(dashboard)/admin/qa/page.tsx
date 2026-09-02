'use client'

import { useState } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Pencil, Trash2, Archive, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  CHANGES_REQUESTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PUBLISHED: 'bg-purple-100 text-purple-700',
  ARCHIVED: 'bg-red-100 text-red-700',
}

export default function AdminQAPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = trpc.adminQA.adminList.useQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    questionType: typeFilter as any,
    page,
    pageSize,
  })

  const deleteMutation = trpc.adminQA.delete.useMutation({
    onSuccess: () => {
      // Refresh
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Q&A Management</h1>
          <p className="text-muted-foreground">Manage your question content workflow</p>
        </div>
        <Button asChild>
          <Link href="/admin/qa/new">
            <Plus className="h-4 w-4 mr-2" />
            New Question
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Status: {statusFilter || 'All'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>All</DropdownMenuItem>
                {Object.keys(STATUS_COLORS).map(status => (
                  <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                    {status.replace('_', ' ')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Type: {typeFilter || 'All'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter(null)}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('MCQ')}>MCQ</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('SHORT')}>Short Answer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('LONG')}>Long Answer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Question List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : data?.questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium">No questions found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search || statusFilter || typeFilter ? 'Try different filters.' : 'Create your first question.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.questions.map(question => (
            <Card key={question.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-2">{question.text}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {question.subject && <Badge variant="secondary" className="text-xs">{question.subject.name}</Badge>}
                      {question.chapter && <Badge variant="outline" className="text-xs">{question.chapter.name}</Badge>}
                      <Badge variant="outline" className="text-xs">{question.questionType}</Badge>
                      <Badge className={`text-xs ${STATUS_COLORS[question.status] || ''}`}>{question.status.replace('_', ' ')}</Badge>
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
                        <Link href={`/admin/qa/${question.id}/edit`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/qa/${question.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Delete this question? This cannot be undone.')) {
                            deleteMutation.mutate({ id: question.id })
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && Math.ceil(data.total / pageSize) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm py-1">Page {page} of {Math.ceil(data.total / pageSize)}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(data.total / pageSize), p + 1))} disabled={page === Math.ceil(data.total / pageSize)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
