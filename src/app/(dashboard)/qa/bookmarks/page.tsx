'use client'

import { useState } from 'react'
import { Bookmark, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function QABookmarksPage() {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<'newest' | 'oldest' | 'due'>('newest')
  const pageSize = 20

  const { data, isLoading } = trpc.qa.bookmarks.useQuery({ page, pageSize, sort })
  const toggleBookmark = trpc.qa.toggleBookmark.useMutation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bookmarked Questions</h1>
        <p className="text-muted-foreground">Your saved questions for revision</p>
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        {(['newest', 'oldest', 'due'] as const).map(s => (
          <Button
            key={s}
            variant={sort === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort(s)}
          >
            {s === 'newest' ? 'Newest' : s === 'oldest' ? 'Oldest' : 'Due for Review'}
          </Button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : data?.bookmarks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium">No bookmarks yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Bookmark questions to save them for later revision.
            </p>
            <Button asChild className="mt-4">
              <Link href="/qa">Browse Questions</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.bookmarks.map(bookmark => (
            <Card key={bookmark.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Link href={`/qa/${bookmark.question.id}`}>
                      <p className="font-medium text-sm line-clamp-2 hover:text-burgundy-600">
                        {bookmark.question.text}
                      </p>
                    </Link>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {bookmark.question.subject && (
                        <Badge variant="secondary" className="text-xs">
                          {bookmark.question.subject.name}
                        </Badge>
                      )}
                      {bookmark.question.chapter && (
                        <Badge variant="outline" className="text-xs">
                          {bookmark.question.chapter.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {bookmark.question.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleBookmark.mutate({ questionId: bookmark.questionId })}
                    className="p-1.5 hover:bg-accent rounded"
                    title="Remove bookmark"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
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
