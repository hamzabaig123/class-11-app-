'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Send, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function AdminQAEditPage() {
  const params = useParams()
  const router = useRouter()
  const questionId = params.questionId as string
  const isNew = questionId === 'new'

  const { data: question, isLoading: loadingQuestion } = trpc.qa.get.useQuery(
    { id: questionId },
    { enabled: !isNew }
  )
  const { data: subjects } = trpc.subjects.list.useQuery({ includeArchived: false })

  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState('')

  const { data: chapters } = trpc.chapters.list.useQuery(
    { subjectId: selectedSubjectId, includeArchived: false },
    { enabled: !!selectedSubjectId }
  )

  const [formData, setFormData] = useState({
    text: '',
    explanation: '',
    hint: '',
    difficulty: 'MEDIUM',
    questionType: 'SHORT',
    marks: '',
    estimatedMinutes: '',
    examLabel: '',
    year: '',
    correctLabel: '',
    answerContent: '',
    keyPoints: '',
    tags: '',
  })

  useEffect(() => {
    if (question) {
      setFormData({
        text: question.text || '',
        explanation: question.explanation || '',
        hint: question.hint || '',
        difficulty: question.difficulty || 'MEDIUM',
        questionType: question.questionType || 'SHORT',
        marks: question.marks?.toString() || '',
        estimatedMinutes: question.estimatedMinutes?.toString() || '',
        examLabel: question.examLabel || '',
        year: question.year?.toString() || '',
        correctLabel: question.answer?.correctLabel || '',
        answerContent: question.answerContent?.content || '',
        keyPoints: question.answerContent?.keyPoints ? JSON.parse(question.answerContent.keyPoints).join('\n') : '',
        tags: question.tags?.map(t => t.name).join(', ') || '',
      })
      setSelectedSubjectId(question.subjectId || '')
      setSelectedChapterId(question.chapterId || '')
      setSelectedTopicId(question.topicId || '')
    }
  }, [question])

  useEffect(() => {
    setSelectedChapterId('')
    setSelectedTopicId('')
  }, [selectedSubjectId])

  const createMutation = trpc.adminQA.create.useMutation({
    onSuccess: (q) => {
      toast({ title: 'Question created' })
      router.push(`/admin/qa/${q.id}/edit`)
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const updateMutation = trpc.adminQA.update.useMutation({
    onSuccess: () => toast({ title: 'Question updated' }),
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const submitMutation = trpc.adminQA.submitForReview.useMutation({
    onSuccess: () => {
      toast({ title: 'Submitted for review' })
      router.push('/admin/qa')
    },
  })

  const publishMutation = trpc.adminQA.publish.useMutation({
    onSuccess: () => {
      toast({ title: 'Question published' })
      router.push('/admin/qa')
    },
  })

  const archiveMutation = trpc.adminQA.archive.useMutation({
    onSuccess: () => {
      toast({ title: 'Question archived' })
      router.push('/admin/qa')
    },
  })

  const handleSave = () => {
    const data = {
      text: formData.text,
      explanation: formData.explanation || undefined,
      hint: formData.hint || undefined,
      difficulty: formData.difficulty as any,
      questionType: formData.questionType as any,
      marks: formData.marks ? parseInt(formData.marks) : undefined,
      estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes) : undefined,
      examLabel: formData.examLabel || undefined,
      year: formData.year ? parseInt(formData.year) : undefined,
      subjectId: selectedSubjectId || undefined,
      chapterId: selectedChapterId || undefined,
      topicId: selectedTopicId || undefined,
      correctLabel: formData.correctLabel as any || undefined,
      answerContent: formData.answerContent || undefined,
      keyPoints: formData.keyPoints ? formData.keyPoints.split('\n').filter(Boolean) : undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    }

    if (isNew) {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate({ id: questionId, ...data })
    }
  }

  if (!isNew && loadingQuestion) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isNew ? 'Create Question' : 'Edit Question'}</h1>
            {question && (
              <Badge variant="outline" className="text-xs">{question.status}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={isNew ? '/admin/qa' : `/qa/${questionId}`}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          {!isNew && question?.status === 'DRAFT' && (
            <Button variant="default" onClick={() => submitMutation.mutate({ id: questionId })}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          )}
          {!isNew && question?.status === 'APPROVED' && (
            <Button variant="default" onClick={() => publishMutation.mutate({ id: questionId })}>
              Publish
            </Button>
          )}
          {!isNew && question?.status === 'PUBLISHED' && (
            <Button variant="destructive" onClick={() => archiveMutation.mutate({ id: questionId })}>
              Archive
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Question & Answer</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chapter</Label>
                  <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={!selectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedSubjectId ? 'Select chapter' : 'Select subject first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.questionType} onValueChange={(v) => setFormData(p => ({ ...p, questionType: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">MCQ</SelectItem>
                      <SelectItem value="SHORT">Short Answer</SelectItem>
                      <SelectItem value="LONG">Long Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(v) => setFormData(p => ({ ...p, difficulty: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question */}
          <Card>
            <CardHeader>
              <CardTitle>Question</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.text}
                onChange={(e) => setFormData(p => ({ ...p, text: e.target.value }))}
                placeholder="Enter the question..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Answer */}
          <Card>
            <CardHeader>
              <CardTitle>Answer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.questionType === 'MCQ' ? (
                <>
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2 mt-2">
                      {['A', 'B', 'C', 'D'].map(label => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded bg-burgundy-100 text-burgundy-700 font-medium">
                            {label}
                          </div>
                          <Input placeholder={`Option ${label}`} />
                          <label className="flex items-center gap-1">
                            <input type="radio" name="correctLabel" value={label} />
                            <span className="text-sm">Correct</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Explanation</Label>
                    <Textarea
                      value={formData.explanation}
                      onChange={(e) => setFormData(p => ({ ...p, explanation: e.target.value }))}
                      placeholder="Why is this the correct answer?"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Model Answer</Label>
                    <Textarea
                      value={formData.answerContent}
                      onChange={(e) => setFormData(p => ({ ...p, answerContent: e.target.value }))}
                      placeholder="Write the model answer..."
                      rows={8}
                    />
                  </div>
                  <div>
                    <Label>Key Points (one per line)</Label>
                    <Textarea
                      value={formData.keyPoints}
                      onChange={(e) => setFormData(p => ({ ...p, keyPoints: e.target.value }))}
                      placeholder="Key point 1&#10;Key point 2&#10;Key point 3"
                      rows={4}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Educational Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Marks</Label>
                  <Input
                    type="number"
                    value={formData.marks}
                    onChange={(e) => setFormData(p => ({ ...p, marks: e.target.value }))}
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <Label>Estimated Minutes</Label>
                  <Input
                    type="number"
                    value={formData.estimatedMinutes}
                    onChange={(e) => setFormData(p => ({ ...p, estimatedMinutes: e.target.value }))}
                    placeholder="e.g., 10"
                  />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData(p => ({ ...p, year: e.target.value }))}
                    placeholder="e.g., 2024"
                  />
                </div>
                <div>
                  <Label>Exam Label</Label>
                  <Input
                    value={formData.examLabel}
                    onChange={(e) => setFormData(p => ({ ...p, examLabel: e.target.value }))}
                    placeholder="e.g., Board Exam 2024"
                  />
                </div>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData(p => ({ ...p, tags: e.target.value }))}
                  placeholder="e.g., biology, cell, important"
                />
              </div>
              <div>
                <Label>Hint (optional)</Label>
                <Input
                  value={formData.hint}
                  onChange={(e) => setFormData(p => ({ ...p, hint: e.target.value }))}
                  placeholder="A subtle hint for the learner"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
