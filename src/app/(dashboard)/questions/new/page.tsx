'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
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

  const { data: subjects } = trpc.subjects.list.useQuery()
  const { data: topics } = trpc.topics.list.useQuery({ subjectId: '' })

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

  const createSubject = trpc.subjects.create.useMutation({
    onSuccess: (subject) => {
      setFormData(prev => ({ ...prev, subjectId: subject.id }))
      toast({ title: 'Subject created', description: 'You can now select it for your question.' })
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
      subjectId: formData.subjectId || undefined,
      topicId: formData.topicId || undefined,
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
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={formData.difficulty} onValueChange={v => handleChange('difficulty', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">Easy</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HARD">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year (optional)</Label>
                    <Input
                      id="year"
                      type="number"
                      min="1900"
                      max="2100"
                      value={formData.year}
                      onChange={(e) => handleChange('year', e.target.value)}
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Source (optional)</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => handleChange('source', e.target.value)}
                    placeholder="e.g., NEET 2023, Custom, Textbook name"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="subjectId">Subject</Label>
                    <Select value={formData.subjectId} onValueChange={v => handleChange('subjectId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {subjects?.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="link" size="sm" onClick={(e) => {
                      e.preventDefault()
                      const name = prompt('Subject name:')
                      if (name) createSubject.mutate({ name })
                    }}>
                      <Plus className="h-3 w-3 mr-1" />
                      Create new
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topicId">Topic (Chapter)</Label>
                    <Select value={formData.topicId} onValueChange={v => handleChange('topicId', v)} disabled={!formData.subjectId}>
                      <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {formData.subjectId && topics?.filter(t => t.subjectId === formData.subjectId).map(topic => (
                          <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="anatomy, cardiology, high-yield"
                  />
                </div>
              </CardContent>
            </Card>

            <CardFooter className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" size="lg" loading={createQuestion.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Create Question
              </Button>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Questions</CardTitle>
              <CardDescription>Upload a file or use AI Studio to generate questions from your study materials</CardDescription>
            </CardHeader>
            <CardContent className="py-12 text-center">
              <Upload className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Import feature coming soon</h3>
              <p className="text-muted-foreground mt-1">AI Studio will allow you to upload PDFs, DOCX, images, and text files to automatically extract MCQs.</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/ai-studio">Go to AI Studio</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subject">
          <Card>
            <CardHeader>
              <CardTitle>Create Subject</CardTitle>
              <CardDescription>Organize your questions into subjects and chapters</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault()
                const name = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value
                if (name) {
                  createSubject.mutate({ name, description: (e.currentTarget.elements.namedItem('description') as HTMLTextAreaElement).value })
                  ;(e.currentTarget.elements.namedItem('name') as HTMLInputElement).value = ''
                  ;(e.currentTarget.elements.namedItem('description') as HTMLTextAreaElement).value = ''
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subjectName">Subject Name *</Label>
                  <Input id="subjectName" name="name" placeholder="e.g., Biology, Physics, History" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjectDescription">Description</Label>
                  <Textarea id="subjectDescription" name="description" placeholder="Optional description" rows={3} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={createSubject.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Subject
                  </Button>
                </div>
              </form>

              {subjects && subjects.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-3">Existing Subjects</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {subjects.map(subject => (
                      <Badge key={subject.id} variant="secondary" className="h-auto p-3 text-left gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject._count.questions} questions</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}