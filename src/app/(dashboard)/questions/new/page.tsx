'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, BookOpen, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export default function NewQuestionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'create'

  const { data: subjects } = trpc.subjects.list.useQuery({ includeArchived: false })
  const [selectedSubjectId, setSelectedSubjectId] = useState(searchParams.get('subjectId') || '')
  const [selectedChapterId, setSelectedChapterId] = useState(searchParams.get('chapterId') || '')

  // Fetch chapters only when a subject is selected
  const { data: chapters } = trpc.chapters.list.useQuery(
    { subjectId: selectedSubjectId, includeArchived: false },
    { enabled: !!selectedSubjectId }
  )

  // Reset chapter when subject changes
  useEffect(() => {
    setSelectedChapterId('')
  }, [selectedSubjectId])

  const [formData, setFormData] = useState({
    text: '',
    options: { A: '', B: '', C: '', D: '' },
    correctLabel: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '',
    hint: '',
    source: '',
    year: '',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
    subjectId: '',
    topicId: '',
    chapterId: '',
    tags: '',
  })

  const createQuestion = trpc.questions.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Question created', description: 'Your MCQ has been added to the library.' })
      router.push('/questions')
      router.refresh()
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

    createQuestion.mutate({
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Question</h1>
          <p className="text-muted-foreground">Add a new MCQ to your library</p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={v => router.push(`/questions/new?tab=${v}`)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Create MCQ
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Import MCQs
          </TabsTrigger>
          <TabsTrigger value="subject">
            <BookOpen className="h-4 w-4 mr-2" />
            Create Subject
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
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
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={createQuestion.isPending || !formData.text.trim()}>
                {createQuestion.isPending ? 'Creating...' : 'Create Question'}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import MCQs</CardTitle>
              <CardDescription>Upload PDF or image files to extract MCQs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Import functionality is available in AI Studio.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/ai-studio">Go to AI Studio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subject">
          <Card>
            <CardHeader>
              <CardTitle>Create Subject</CardTitle>
              <CardDescription>Add a new subject to organize your questions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Use the syllabus navigator in the sidebar to create and manage subjects.
              </p>
              <Button asChild className="mt-4">
                <Link href="/subjects">View Subjects</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
