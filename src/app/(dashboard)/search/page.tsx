'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, FileText, FolderOpen, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isLoading } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 }
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">Find questions, notes, and collections</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search anything..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-12 h-12 text-lg"
          autoFocus
        />
      </div>

      {!debouncedQuery && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Start typing to search</p>
          </CardContent>
        </Card>
      )}

      {isLoading && debouncedQuery && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* Questions */}
          {results.questions && results.questions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />Questions ({results.questions.length})
              </h2>
              <div className="space-y-2">
                {results.questions.map((q: any) => (
                  <Link key={q.id} href={`/questions/${q.id}`}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                        <div className="flex gap-2 mt-1">
                          {q.subject?.name && <Badge variant="outline" className="text-[10px]">{q.subject.name}</Badge>}
                          <Badge variant="secondary" className="text-[10px]">{q.difficulty}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {results.notes && results.notes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />Notes ({results.notes.length})
              </h2>
              <div className="space-y-2">
                {results.notes.map((n: any) => (
                  <Link key={n.id} href={`/notes/${n.id}`}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{n.body?.slice(0, 100)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Collections */}
          {results.collections && results.collections.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />Collections ({results.collections.length})
              </h2>
              <div className="space-y-2">
                {results.collections.map((c: any) => (
                  <Link key={c.id} href={`/collections/${c.id}`}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c._count?.questions || 0} questions</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {results.questions?.length === 0 && results.notes?.length === 0 && results.collections?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <HelpCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No results found for "{debouncedQuery}"</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
