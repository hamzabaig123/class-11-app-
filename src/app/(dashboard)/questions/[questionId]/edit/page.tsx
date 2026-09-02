'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Archive, Trash2, Copy, History, BookOpen, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export default function EditQuestionPage() {
  const params = useParams()
  const router = useRouter()
  const questionId = params.questionId as string

  const { data: question, isLoading } = trpc.questions.get.useQuery({ id: questionId })
  const { data: subjects } = trpc.subjects.list.useQuery({ includeArchived: false })
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')

  const { data: chapters } = trpc.chapters.list.useQuery(
    { subjectId: selectedSubjectId, includeArchived: false },
    { enabled: !!selectedSubjectId }
  )

  const [formData, setFormData] = useState({
    text: '',
    options: { A: '', B: '', C: '', D: '' },
    correctLabel: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '',
    hint: '',
    source: '',
    year: '',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
    tags: '',
    changeNote: '',
  })

  // Load question data into form
  useEffect(() => {
    if (question) {
      setFormData({
        text: question.text,
        options: {
          A: question.options.find(o => o.label === 'A')?.text || '',
          B: question.options.find(o => o.label === 'B')?.text || '',
          C: question.options.find(o => o.label === 'C')?.text || '',
          D: question.options.find(o => o.label === 'D')?.text || '',
        },
        correctLabel: question.answer?.correctLabel as 'A' | 'B' | 'C' | 'D' || 'A',
        explanation: question.explanation || '',
        hint: question.hint || '',
        source: question.source || '',
        year: question.year?.toString() || '',
        difficulty: question.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        tags: question.tags.map(t => t.name).join(', '),
        changeNote: '',
      })
      if (question.subjectId) setSelectedSubjectId(question.subjectId)
      if (question.chapterId) setSelectedChapterId(question.chapterId)
    }
  }, [question])

  // Reset chapter when subject changes
  useEffect(() => {
    setSelectedChapterId('')
  }, [selectedSubjectId])

  const updateQuestion = trpc.questions.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Question updated', description: 'Your changes have been saved.' })
      router.push(`/questions/${questionId}`)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.text.trim()) {
      toast({ title: 'Error', description: 'Question text is required', variant: 'destructive' })
      return
    }
    if (OPTION_LABELS.some(l => !formData.options[l].trim())) {
      toast({ title: 'Error', description: 'All four options are required', variant: 'destructive' })
      return
    }

    updateQuestion.mutate({
      id: questionId,
      text: formData.text,
      options: OPTION_LABELS.map(label => ({ label, text: formData.options[label] })),
      correctLabel: formData.correctLabel,
      explanation: formData.explanation || undefined,
      hint: formData.hint || undefined,
      source: formData.source || undefined,
      year: formData.year ? parseInt(formData.year) : undefined,
      difficulty: formData.difficulty,
      subjectId: selectedSubjectId || undefined,
      chapterId: selectedChapterId || undefined,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      changeNote: formData.changeNote || undefined,
    })
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleOptionChange = (label: 'A' | 'B' | 'C' | 'D', value: string) => {
    setFormData(prev => ({
      ...prev,
      options: { ...prev.options, [label]: value },
    }))
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Question not found</h2>
        <Button asChild className="mt-4">
          <Link href="/questions">Back to Questions</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Question</h1>
            <p className="text-muted-foreground text-sm">
              Version {question.version} • Last updated {new Date(question.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/questions/${questionId}/history`}>
            <History className="h-4 w-4 mr-2" />
            View History
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Question Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Question Text *</Label>
              <Textarea
                id="text"
                value={formData.text}
                onChange={(e) => handleChange('text', e.target.value)}
                placeholder="Enter your question..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Options *</Label>
              <div className="space-y-2">
                {OPTION_LABELS.map(label => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-burgundy-100 text-burgundy-700 font-medium">
                      {label}
                    </div>
                    <Input
                      placeholder={`Option ${label}`}
                      value={formData.options[label]}
                      onChange={(e) => handleOptionChange(label, e.target.value)}
                    />
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="correctLabel"
                        value={label}
                        checked={formData.correctLabel === label}
                        onChange={() => handleChange('correctLabel', label)}
                        className="text-burgundy-600"
                      />
                      <span className="text-sm text-muted-foreground">Correct</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation</Label>
              <Textarea
                id="explanation"
                value={formData.explanation}
                onChange={(e) => handleChange('explanation', e.target.value)}
                placeholder="Why is this the correct answer?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hint">Hint (optional)</Label>
              <Input
                id="hint"
                value={formData.hint}
                onChange={(e) => handleChange('hint', e.target.value)}
                placeholder="A subtle hint for the learner"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Curriculum Placement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                >
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
              <div className="space-y-2">
                <Label htmlFor="chapter">Chapter</Label>
                <Select
                  value={selectedChapterId}
                  onValueChange={setSelectedChapterId}
                  disabled={!selectedSubjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedSubjectId ? "Select chapter" : "Select a subject first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                placeholder="e.g., Textbook page 45"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="e.g., biology, cell, important"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v) => handleChange('difficulty', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  value={formData.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                  placeholder="e.g., 2024"
                  type="number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="changeNote">Change Note</Label>
              <Input
                id="changeNote"
                value={formData.changeNote}
                onChange={(e) => handleChange('changeNote', e.target.value)}
                placeholder="Brief description of changes"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateQuestion.isPending || !formData.text.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {updateQuestion.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
