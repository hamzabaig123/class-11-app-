'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Eye, RefreshCw, Trash2, AlertCircle, FileSearch, Loader2, FileX, CheckCheck, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc'

type ImportStatus = 'uploaded' | 'queued' | 'extracting' | 'extracted' | 'structuring' | 'structured_ok' | 'structuring_failed' | 'pending_review' | 'needs_manual' | 'failed'

const TERMINAL_STATUSES = ['pending_review', 'structured_ok', 'needs_manual', 'failed', 'structuring_failed']
const PROCESSING_STATUSES = ['queued', 'extracting', 'extracting', 'structuring']

export default function ReviewPage() {
  const router = useRouter()
  const params = useParams()
  const importId = params.importId as string

  const [activeTab, setActiveTab] = useState('pending')
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())

  // Poll while processing, stop when terminal
  const { data: importData, refetch: refetchImport, isLoading: isLoadingImport } = trpc.imports.getStatus.useQuery(
    { id: importId },
    { refetchInterval: (data) => {
      if (!data) return 2000
      return TERMINAL_STATUSES.includes(data.status) ? false : 3000
    }}
  )

  const { data: candidates, refetch: refetchCandidates, isLoading: isLoadingCandidates } = trpc.imports.reviewList.useQuery(
    { importId, status: (['pending', 'approved', 'rejected'].includes(activeTab) ? activeTab as 'pending' | 'approved' | 'rejected' : undefined) },
    { enabled: !!importData && TERMINAL_STATUSES.includes(importData.status) }
  )

  const approveOneMutation = trpc.imports.approveOne.useMutation({
    onSuccess: () => {
      refetchImport()
      refetchCandidates()
      setSelectedQuestions(new Set())
    },
  })

  const rejectOneMutation = trpc.imports.rejectOne.useMutation({
    onSuccess: () => {
      refetchImport()
      refetchCandidates()
      setSelectedQuestions(new Set())
    },
  })

  const bulkApproveMutation = trpc.imports.bulkApprove.useMutation({
    onSuccess: () => {
      refetchImport()
      refetchCandidates()
      setSelectedQuestions(new Set())
    },
  })

  const retryMutation = trpc.imports.retry.useMutation({
    onSuccess: () => refetchImport(),
  })

  const handleSelectAll = () => {
    if (!candidates?.candidates) return
    if (selectedQuestions.size === candidates.candidates.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(candidates.candidates.map((c) => c.id)))
    }
  }

  const handleSelect = (id: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleApprove = async (questionIds: string[]) => {
    for (const id of questionIds) {
      await approveOneMutation.mutateAsync({ id })
    }
  }

  const handleReject = async (questionIds: string[]) => {
    for (const id of questionIds) {
      await rejectOneMutation.mutateAsync({ id })
    }
  }

  const handleBulkApprove = async () => {
    if (confirm(`Approve all ${pendingCount} pending questions? This cannot be undone.`)) {
      await bulkApproveMutation.mutateAsync({ importId })
    }
  }

  const handleRetry = async () => {
    await retryMutation.mutateAsync({ id: importId })
  }

  // Loading state while fetching import data
  if (isLoadingImport || !importData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading import details...</p>
      </div>
    )
  }

  // Processing state - extraction/structuring in progress
  if (PROCESSING_STATUSES.includes(importData.status)) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/ai-studio')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Processing Import</h1>
            <p className="text-muted-foreground">{importData.fileName}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <FileSearch className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/50" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">
                  {importData.status === 'extracting' ? 'Extracting Text' : 
                   importData.status === 'structuring' ? 'Structuring Questions' : 'Analyzing Document'}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {importData.progressStep || 'Processing your document...'}
                </p>
              </div>

              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">File size:</span>
                  <span className="font-medium">{(importData.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{importData.fileType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {importData.status === 'extracting' ? 'Extracting' : 
                     importData.status === 'structuring' ? 'Structuring' : 'Processing'}
                  </Badge>
                </div>
              </div>

              <Button variant="outline" onClick={() => refetchImport()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => router.push('/ai-studio')}>
            Return to AI Studio
          </Button>
        </div>
      </div>
    )
  }

  // Failed state - extraction/structuring error
  if (importData.status === 'failed' || importData.status === 'structuring_failed') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/ai-studio')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Processing Import</h1>
            <p className="text-muted-foreground">{importData.fileName}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <FileSearch className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/50" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Analyzing Your Document</h3>
                <p className="text-muted-foreground max-w-md">
                  We're extracting questions from your document. This may take a minute...
                </p>
              </div>

              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">File size:</span>
                  <span className="font-medium">{(importData.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{importData.fileType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processing
                  </Badge>
                </div>
              </div>

              <Button variant="outline" onClick={() => refetchImport()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => router.push('/ai-studio')}>
            Return to AI Studio
          </Button>
        </div>
      </div>
    )
  }

  // Failed state - extraction/structuring error
  if (importData.status === 'failed' || importData.status === 'structuring_failed') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/ai-studio')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {importData.status === 'structuring_failed' ? 'Structuring Failed' : 'Extraction Failed'}
            </h1>
            <p className="text-muted-foreground">{importData.fileName}</p>
          </div>
        </div>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="rounded-full bg-destructive/10 p-6">
                <FileX className="h-16 w-16 text-destructive" />
              </div>
              
              <div className="text-center space-y-2 max-w-2xl">
                <h3 className="text-xl font-semibold">
                  {importData.status === 'structuring_failed' 
                    ? 'Could Not Structure Questions' 
                    : 'Could Not Extract Questions'}
                </h3>
                <p className="text-muted-foreground">
                  {importData.errorReason || 'An error occurred while processing your document.'}
                </p>
                {importData.errorMessage && (
                  <div className="mt-4 p-4 bg-muted rounded-lg text-left">
                    <p className="text-sm font-medium mb-2">Technical Details:</p>
                    <p className="text-sm text-muted-foreground font-mono text-xs">{importData.errorMessage}</p>
                  </div>
                )}
              </div>

              <div className="w-full max-w-md space-y-4 pt-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Common Issues:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>The PDF may be scanned (image-based) without OCR</li>
                    <li>The document uses an unsupported format or encoding</li>
                    <li>Questions are not in a recognizable MCQ format</li>
                    <li>Multi-column layout confused the text extraction</li>
                    <li>The file is corrupted or password-protected</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Try These Solutions:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Re-scan the document with higher quality settings</li>
                    <li>Use OCR mode if available</li>
                    <li>Convert to text-based PDF or DOCX format</li>
                    <li>Upload a clearer version of the file</li>
                    <li>Manually enter questions if extraction continues to fail</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleRetry} disabled={retryMutation.isLoading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {retryMutation.isLoading ? 'Retrying...' : 'Retry'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/ai-studio/upload')}>
                  Try Another File
                </Button>
                <Button variant="outline" onClick={() => router.push('/questions/new')}>
                  Create Manually
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => router.push('/ai-studio')}>
            Back to AI Studio
          </Button>
        </div>
      </div>
    )
  }
  // Completed but no questions detected
  if ((importData.status === 'pending_review' || importData.status === 'structured_ok') && importData.totalQuestions === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/ai-studio')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">No Questions Found</h1>
            <p className="text-muted-foreground">{importData.fileName}</p>
          </div>
        </div>

        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-6">
                <AlertTriangle className="h-16 w-16 text-yellow-600 dark:text-yellow-500" />
              </div>
              
              <div className="text-center space-y-2 max-w-2xl">
                <h3 className="text-xl font-semibold">Text Was Extracted, But No MCQ Patterns Were Found</h3>
                <p className="text-muted-foreground">
                  The document was successfully read, but we couldn't identify any multiple-choice questions with recognizable option patterns (A, B, C, D).
                </p>
              </div>

              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">File size:</span>
                  <span className="font-medium">{(importData.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{importData.fileType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Questions detected:</span>
                  <span className="font-medium">0</span>
                </div>
              </div>

              <div className="w-full max-w-md space-y-4 pt-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Possible Reasons:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Questions don't use standard A-D option labels</li>
                    <li>Options are formatted as paragraphs rather than lists</li>
                    <li>The document contains subjective or essay questions</li>
                    <li>Question numbering or formatting is non-standard</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => router.push('/ai-studio/upload')}>
                  Try Another File
                </Button>
                <Button variant="outline" onClick={() => router.push('/questions/new')}>
                  Create Questions Manually
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => router.push('/ai-studio')}>
            Back to AI Studio
          </Button>
        </div>
      </div>
    )
  }

  // Success state - questions available for review
  const pendingCount = importData.candidateCounts?.pending || 0
  const allReviewed = pendingCount === 0 && importData.totalQuestions > 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/ai-studio')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Import</h1>
          <p className="text-muted-foreground">{importData.fileName}</p>
        </div>
      </div>

      {allReviewed && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <CheckCheck className="h-8 w-8 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">All Questions Reviewed</h3>
                <p className="text-sm text-muted-foreground">
                  You've completed the review process. {importData.approvedCount} questions approved, {importData.rejectedCount} rejected.
                </p>
              </div>
              <Button className="ml-auto" onClick={() => router.push('/questions')}>
                View Question Library
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{importData.totalQuestions}</div>
            <p className="text-sm text-muted-foreground">Total Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{importData.approvedCount}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{importData.rejectedCount}</div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved
                {importData.approvedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{importData.approvedCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected
                {importData.rejectedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{importData.rejectedCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoadingCandidates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : candidates?.candidates && candidates.candidates.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.size === candidates.candidates.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-muted-foreground">
                        Select all ({selectedQuestions.size}/{candidates.candidates.length})
                      </span>
                    </div>
                    {selectedQuestions.size > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(Array.from(selectedQuestions))}
                          disabled={approveOneMutation.isLoading}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve ({selectedQuestions.size})
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(Array.from(selectedQuestions))}
                          disabled={rejectOneMutation.isLoading}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject ({selectedQuestions.size})
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {candidates.candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          selectedQuestions.has(candidate.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedQuestions.has(candidate.id)}
                            onChange={() => handleSelect(candidate.id)}
                            className="h-4 w-4 mt-1 rounded border-gray-300"
                          />
                          <div className="flex-1 space-y-3">
                            <p className="font-medium leading-relaxed">{candidate.questionText}</p>
                            {candidate.options && (
                              <div className="grid gap-2">
                                {JSON.parse(typeof candidate.options === 'string' ? candidate.options : '[]')
                                  .map((opt: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className={`text-sm p-2 rounded ${
                                        opt.label === candidate.correctLabel
                                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                          : 'bg-muted/50'
                                      }`}
                                    >
                                      <span className="font-medium">{opt.label}.</span> {opt.text}
                                      {opt.label === candidate.correctLabel && (
                                        <Badge variant="secondary" className="ml-2 text-xs">Correct</Badge>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                            {candidate.explanation && (
                              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
                                <span className="font-medium">Explanation:</span> {candidate.explanation}
                              </div>
                            )}
                            <div className="flex gap-2 flex-wrap">
                              {candidate.subjectName && (
                                <Badge variant="secondary">{candidate.subjectName}</Badge>
                              )}
                              {candidate.topicName && (
                                <Badge variant="outline">{candidate.topicName}</Badge>
                              )}
                              {candidate.difficulty && (
                                <Badge variant="outline">{candidate.difficulty}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove([candidate.id])}
                              disabled={approveOneMutation.isLoading}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject([candidate.id])}
                              disabled={rejectOneMutation.isLoading}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  {activeTab === 'pending' ? (
                    <>
                      <CheckCheck className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium">All Done!</h3>
                      <p className="text-muted-foreground mt-1">
                        All questions from this import have been reviewed.
                      </p>
                    </>
                  ) : (
                    <>
                      <FileSearch className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <h3 className="text-lg font-medium">No {activeTab} questions</h3>
                      <p className="text-muted-foreground mt-1">
                        {activeTab === 'approved' && 'Approved questions will appear here'}
                        {activeTab === 'rejected' && 'Rejected questions will appear here'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => router.push('/ai-studio')}>
          Back to AI Studio
        </Button>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Button variant="outline" onClick={handleBulkApprove} disabled={bulkApproveMutation.isLoading}>
              <CheckCheck className="h-4 w-4 mr-2" />
              {bulkApproveMutation.isLoading ? 'Approving...' : `Approve All (${pendingCount})`}
            </Button>
          )}
          <Button variant="outline" onClick={() => refetchImport()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  )
}
