'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Eye, RefreshCw, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc'

export default function ReviewPage() {
  const router = useRouter()
  const params = useParams()
  const importId = params.importId as string

  const [activeTab, setActiveTab] = useState('pending')
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())

  const { data: importData, refetch: refetchImport } = trpc.imports.getStatus.useQuery(
    { id: importId },
    { refetchInterval: 2000 }
  )

  const { data: candidates, refetch: refetchCandidates } = trpc.imports.reviewList.useQuery(
    { importId, status: activeTab.toUpperCase() as any },
    { enabled: activeTab !== 'all' }
  )

  const approveMutation = trpc.imports.approve.useMutation({
    onSuccess: () => {
      refetchImport()
      refetchCandidates()
      setSelectedQuestions(new Set())
    },
  })

  const rejectMutation = trpc.imports.reject.useMutation({
    onSuccess: () => {
      refetchImport()
      refetchCandidates()
      setSelectedQuestions(new Set())
    },
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
    await approveMutation.mutateAsync({ importId, questionIds })
  }

  const handleReject = async (questionIds: string[]) => {
    await rejectMutation.mutateAsync({ importId, questionIds })
  }

  if (!importData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
            <div className="text-2xl font-bold text-yellow-600">
              {importData.candidateCounts?.pending || 0}
            </div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {candidates?.candidates && candidates.candidates.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.size === candidates.candidates.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4"
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
                          disabled={approveMutation.isLoading}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve ({selectedQuestions.size})
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(Array.from(selectedQuestions))}
                          disabled={rejectMutation.isLoading}
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
                        className={`p-4 rounded-lg border ${
                          selectedQuestions.has(candidate.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-muted'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedQuestions.has(candidate.id)}
                            onChange={() => handleSelect(candidate.id)}
                            className="h-4 w-4 mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{candidate.questionText}</p>
                            {candidate.options && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                {JSON.parse(typeof candidate.options === 'string' ? candidate.options : '[]')
                                  .map((opt: any) => `${opt.label}. ${opt.text}`)
                                  .join(' | ')}
                              </div>
                            )}
                            <div className="mt-2 flex gap-2">
                              {candidate.subjectName && (
                                <Badge variant="secondary">{candidate.subjectName}</Badge>
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
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject([candidate.id])}
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
                  <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No questions found</h3>
                  <p className="text-muted-foreground mt-1">
                    {activeTab === 'pending'
                      ? 'All questions have been reviewed'
                      : `No ${activeTab} questions yet`}
                  </p>
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
        <Button onClick={() => refetchImport()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  )
}