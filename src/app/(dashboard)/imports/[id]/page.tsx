'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Play, CheckCircle, XCircle, AlertTriangle, FileText, Clock, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function ImportDetailPage() {
  const params = useParams()
  const importId = params.id as string
  const [filter, setFilter] = useState('all')

  const { data: importData, isLoading, refetch } = trpc.contentImports.get.useQuery({ id: importId })

  const startProcessing = trpc.contentImports.startProcessing.useMutation({
    onSuccess: () => { refetch(); toast({ title: 'Processing started' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const publishImport = trpc.contentImports.publish.useMutation({
    onSuccess: (result) => { refetch(); toast({ title: `Published ${result.publishedCount} questions` }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  if (isLoading || !importData) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  const items = importData.items || []
  const filteredItems = filter === 'all' ? items : items.filter((i: any) => i.status === filter)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/imports"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{importData.originalFilename}</h1>
          <p className="text-muted-foreground">
            {importData.subject?.name} {importData.chapter?.name && `→ ${importData.chapter.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {importData.status === 'uploaded' && (
            <Button onClick={() => startProcessing.mutate({ id: importId })}>
              <Play className="h-4 w-4 mr-2" />Start Processing
            </Button>
          )}
          {importData.status === 'needs_review' && (
            <Button onClick={() => publishImport.mutate({ id: importId })}>
              <CheckCircle className="h-4 w-4 mr-2" />Publish Approved
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{importData.detectedItems}</p>
            <p className="text-xs text-muted-foreground">Detected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{importData.approvedItems}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{importData.publishedItems}</p>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{importData.failedItems}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-2">
          {['all', 'pending', 'needs_review', 'approved', 'rejected', 'published'].map(status => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No items found</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2">{item.proposedQuestionContent}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                      {item.questionType && <Badge variant="secondary" className="text-[10px]">{item.questionType}</Badge>}
                      {item.proposedDifficulty && <Badge variant="outline" className="text-[10px]">{item.proposedDifficulty}</Badge>}
                      {item.aiConfidence && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(item.aiConfidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    {item.warningsJson && JSON.parse(item.warningsJson).length > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-yellow-600">
                        <AlertTriangle className="h-3 w-3" />
                        {JSON.parse(item.warningsJson)[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {item.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/imports/${importId}/review/${item.id}`}>Review</Link>
                        </Button>
                      </>
                    )}
                    {item.status === 'needs_review' && (
                      <>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/imports/${importId}/review/${item.id}`}>Edit</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
