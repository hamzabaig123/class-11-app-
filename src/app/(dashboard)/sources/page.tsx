'use client'

import { useState } from 'react'
import { Plus, Search, BookOpen, FileText, Archive, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function SourcesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = trpc.sources.list.useQuery({
    search: search || undefined,
    page,
    pageSize,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
          <p className="text-muted-foreground">
            Manage your source documents — textbooks, past papers, and references.
          </p>
        </div>
        <Button asChild>
          <Link href="/sources/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Search</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sources..."
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
      ) : data?.sources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium">No sources yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? 'No sources match your search.' : 'Add your first source document.'}
            </p>
            {!search && (
              <Button asChild className="mt-4">
                <Link href="/sources/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.sources.map(source => (
              <Link key={source.id} href={`/sources/${source.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{source.title}</h3>
                        <p className="text-sm text-muted-foreground">{source.sourceType}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{source.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {source.author && <span>{source.author}</span>}
                      {source.year && <span>• {source.year}</span>}
                    </div>
                    {source.subject && (
                      <Badge variant="secondary" className="text-xs">{source.subject.name}</Badge>
                    )}
                    {source.chapter && (
                      <Badge variant="outline" className="text-xs">{source.chapter.name}</Badge>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span>{source._count.questionLinks} questions</span>
                      {source.externalUrl && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          URL
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > pageSize && (
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
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {Math.ceil(data.total / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(data.total / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
