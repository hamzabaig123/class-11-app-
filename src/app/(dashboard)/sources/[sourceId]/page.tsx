'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, BookOpen, FileText, Archive, ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function SourcePage() {
  const params = useParams()
  const sourceId = params.sourceId as string
  const { data: source, isLoading } = trpc.sources.get.useQuery({ id: sourceId })

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

  if (!source) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Source not found</h2>
        <p className="text-muted-foreground mt-2">This source may have been deleted or you don't have access.</p>
        <Button asChild className="mt-4">
          <Link href="/sources">Back to Sources</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{source.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{source.sourceType}</Badge>
              {source.author && <span className="text-sm text-muted-foreground">{source.author}</span>}
              {source.year && <span className="text-sm text-muted-foreground">{source.year}</span>}
            </div>
            {source.subject && (
              <Link href={`/subjects/${source.subject.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                {source.subject.name}
              </Link>
            )}
            {source.chapter && (
              <Link href={`/chapters/${source.chapter.id}`} className="text-sm text-muted-foreground hover:text-foreground ml-2">
                → {source.chapter.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/sources/${source.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
            <div className="text-2xl font-bold">{source.questionLinks.length}</div>
            <div className="text-sm text-muted-foreground">Linked Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{source.importRecords.length}</div>
            <div className="text-sm text-muted-foreground">Import Records</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{source.status}</div>
            <div className="text-sm text-muted-foreground">Status</div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Source Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{source.sourceType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Author</dt>
              <dd className="font-medium">{source.author || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Edition</dt>
              <dd className="font-medium">{source.edition || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Publisher</dt>
              <dd className="font-medium">{source.publisher || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Year</dt>
              <dd className="font-medium">{source.year || '—'}</dd>
            </div>
            {source.externalUrl && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">External URL</dt>
                <dd>
                  <a href={source.externalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    {source.externalUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Linked Questions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Linked Questions</h2>
        {source.questionLinks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium">No linked questions</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Link questions to this source to track evidence.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {source.questionLinks.map(link => (
              <Link key={link.questionId} href={`/questions/${link.questionId}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <p className="font-medium text-sm line-clamp-2">{link.question.text}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {link.pageNumber && <span>Page {link.pageNumber}</span>}
                      {link.section && <span>• {link.section}</span>}
                      {link.isPrimary && <Badge variant="outline" className="text-xs">Primary</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Import Records */}
      {source.importRecords.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Import History</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {source.importRecords.map(imp => (
              <Link key={imp.id} href={`/imports/${imp.id}/review`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{imp.fileName}</p>
                        <p className="text-xs text-muted-foreground">{imp.totalQuestions} questions</p>
                      </div>
                      <Badge variant="outline">{imp.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
