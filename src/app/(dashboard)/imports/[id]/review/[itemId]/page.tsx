'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Save, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function ReviewItemPage() {
  const params = useParams()
  const importId = params.id as string
  const itemId = params.itemId as string

  const { data: item, isLoading, refetch } = trpc.contentImports.getItem.useQuery({ id: itemId })

  const [questionContent, setQuestionContent] = useState(item?.proposedQuestionContent || '')
  const [answerContent, setAnswerContent] = useState(item?.proposedAnswerContent || '')
  const [questionType, setQuestionType] = useState(item?.questionType || 'SHORT')
  const [marks, setMarks] = useState(item?.proposedMarks?.toString() || '')
  const [difficulty, setDifficulty] = useState(item?.proposedDifficulty || 'MEDIUM')

  const updateItem = trpc.contentImports.updateItem.useMutation({
    onSuccess: () => { refetch(); toast({ title: 'Saved' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const approveItem = trpc.contentImports.approveItem.useMutation({
    onSuccess: () => { refetch(); toast({ title: 'Approved' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const rejectItem = trpc.contentImports.rejectItem.useMutation({
    onSuccess: () => { refetch(); toast({ title: 'Rejected' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  if (isLoading || !item) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  const warnings = item.warningsJson ? JSON.parse(item.warningsJson) : []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/imports/${importId}`}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Review Item</h1>
          <p className="text-muted-foreground text-sm">
            {item.import?.subject?.name} {item.import?.chapter?.name && `→ ${item.import.chapter.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => rejectItem.mutate({ id: itemId })}>
            <XCircle className="h-4 w-4 mr-2" />Reject
          </Button>
          <Button onClick={() => approveItem.mutate({ id: itemId })}>
            <CheckCircle className="h-4 w-4 mr-2" />Approve
          </Button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="font-medium text-yellow-700">Warnings</p>
          </div>
          <ul className="space-y-1">
            {warnings.map((w: string, i: number) => (
              <li key={i} className="text-sm text-yellow-600">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Question</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={questionContent}
              onChange={e => setQuestionContent(e.target.value)}
              rows={6}
              placeholder="Enter question text..."
            />
            <div>
              <Label>Answer</Label>
              <Textarea
                value={answerContent}
                onChange={e => setAnswerContent(e.target.value)}
                rows={8}
                placeholder="Enter answer..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">MCQ</SelectItem>
                  <SelectItem value="SHORT">Short Answer</SelectItem>
                  <SelectItem value="LONG">Long Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marks</Label>
              <Input type="number" value={marks} onChange={e => setMarks(e.target.value)} />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">AI Confidence: {item.aiConfidence ? `${Math.round(item.aiConfidence * 100)}%` : 'N/A'}</Badge>
            </div>
            <Button
              className="w-full"
              onClick={() => updateItem.mutate({
                id: itemId,
                questionContent,
                answerContent,
                questionType: questionType as any,
                marks: marks ? parseInt(marks) : undefined,
                difficulty: difficulty as any,
              })}
            >
              <Save className="h-4 w-4 mr-2" />Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
