'use client'

import { useState } from 'react'
import { Bookmark, Search, Trash2, Play, BookOpen, Tag, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function BookmarksPage() {
  const [search, setSearch] = useState('')

  const { data: bookmarks, isLoading, refetch } = trpc.bookmarks.list.useQuery({
    query: search || undefined,
    page: 1,
    pageSize: 50,
  })

  const removeBookmark = trpc.bookmarks.remove.useMutation({
    onSuccess: () => { refetch(); toast({ title: 'Bookmark removed' }) },
  })

  const bookmarksList = bookmarks?.bookmarks ?? []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
        <p className="text-muted-foreground">Your saved questions for quick review</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bookmarks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}
        </div>
      ) : bookmarksList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bookmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No bookmarks yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Bookmark questions to review them later</p>
            <Button className="mt-4" asChild>
              <Link href="/questions">Browse Questions</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookmarksList.map((bookmark: any) => (
            <Card key={bookmark.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/questions/${bookmark.questionId}`} className="font-medium text-sm hover:text-burgundy-600 transition-colors">
                      {bookmark.question?.text || 'Loading...'}
                    </Link>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {bookmark.question?.subject?.name && <Badge variant="outline">{bookmark.question.subject.name}</Badge>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(bookmark.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/questions/${bookmark.questionId}`}>
                        <BookOpen className="h-3 w-3 mr-1" />View
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeBookmark.mutate({ id: bookmark.id })}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
