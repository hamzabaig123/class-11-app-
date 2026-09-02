'use client'

import { Upload, FileText, Image, Brain, ArrowRight, Loader2, CheckCircle2, XCircle, AlertCircle, Clock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { formatDistanceToNow } from 'date-fns'

export default function AIStudioPage() {
  const { data: imports, isLoading } = trpc.imports.list.useQuery({ limit: 10 })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
      case 'extracting':
      case 'structuring':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'pending_review':
      case 'structured_ok':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
      case 'structuring_failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'uploaded':
      case 'extracted':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>
      case 'extracting':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Extracting</Badge>
      case 'structuring':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Structuring</Badge>
      case 'pending_review':
      case 'structured_ok':
        return <Badge variant="default" className="bg-green-500">Ready for Review</Badge>
      case 'failed':
      case 'structuring_failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'uploaded':
        return <Badge variant="outline">Uploaded</Badge>
      case 'extracted':
        return <Badge variant="outline">Extracted</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
        <p className="text-muted-foreground">
          Import questions from documents, images, or generate them with AI
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-burgundy-200 bg-burgundy-50">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-burgundy-600 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <CardTitle>Document Import</CardTitle>
            <CardDescription>Upload PDF, DOCX, or TXT files</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">PDF</Badge> Text extraction</li>
              <li className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">DOCX</Badge> Word documents</li>
              <li className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">TXT</Badge> Plain text</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/ai-studio/upload?type=document">
                <ArrowRight className="h-4 w-4 ml-2" />
                Upload Document
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-burgundy-100 flex items-center justify-center mb-3">
              <Image className="h-6 w-6 text-burgundy-600" />
            </div>
            <CardTitle>Image Import</CardTitle>
            <CardDescription>Extract MCQs from photos or scans</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">OCR text recognition</li>
              <li className="flex items-center gap-2">Handwriting support</li>
              <li className="flex items-center gap-2">Multiple images</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/ai-studio/upload?type=image">
                <ArrowRight className="h-4 w-4 ml-2" />
                Upload Images
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>AI Generation</CardTitle>
            <CardDescription>Generate questions from topics</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">Topic-based generation</li>
              <li className="flex items-center gap-2">Difficulty control</li>
              <li className="flex items-center gap-2">Bulk creation</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/ai-studio/generate">
                <ArrowRight className="h-4 w-4 ml-2" />
                Generate Questions
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>Review and approve imported questions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground mt-2">Loading imports...</p>
            </div>
          ) : imports && imports.imports.length > 0 ? (
            <div className="space-y-3">
              {imports.imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    {getStatusIcon(imp.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{imp.fileName}</p>
                      {getStatusBadge(imp.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{(imp.fileSize / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(imp.createdAt), { addSuffix: true })}</span>
                      {imp.status === 'COMPLETED' && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-medium">
                            {imp.totalQuestions} question{imp.totalQuestions !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                    {imp.status === 'COMPLETED' && imp.totalQuestions > 0 && (
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-green-600">{imp.approvedCount} approved</span>
                        <span className="text-red-600">{imp.rejectedCount} rejected</span>
                        <span className="text-yellow-600">
                          {imp.totalQuestions - imp.approvedCount - imp.rejectedCount} pending
                        </span>
                      </div>
                    )}
                    {imp.status === 'FAILED' && imp.errorMessage && (
                      <p className="text-sm text-destructive mt-1">{imp.errorMessage}</p>
                    )}
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/ai-studio/review/${imp.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      {imp.status === 'PROCESSING' ? 'View Status' : 'Review'}
                    </Link>
                  </Button>
                </div>
              ))}
              {imports.imports.length >= 10 && (
                <div className="text-center pt-2">
                  <Button variant="link">View all imports</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium">No imports yet</h3>
              <p className="text-muted-foreground mt-1">Your imported questions will appear here for review</p>
              <Button asChild className="mt-4">
                <Link href="/ai-studio/upload">Start your first import</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}