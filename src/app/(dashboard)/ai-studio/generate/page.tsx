'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Brain,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Layers,
  Plus,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc'

const SUBJECT_SUGGESTIONS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English',
  'Pakistan Studies',
  'Urdu',
  'Islamiat',
]

const DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: 'Easy — recall & basic concepts' },
  { value: 'MEDIUM', label: 'Medium — application & analysis' },
  { value: 'HARD', label: 'Hard — evaluation & tricky cases' },
  { value: 'MIXED', label: 'Mixed difficulty' },
]

const TOPIC_TEMPLATES = [
  {
    subject: 'Computer Science',
    icon: Layers,
    topics: [
      'Data Structures: Arrays, Linked Lists, Stacks, Queues',
      'Algorithms: Sorting, Searching, Complexity Analysis',
      'Databases: SQL, Normalization, Transactions',
      'Operating Systems: Processes, Threads, Memory Management',
      'Object Oriented Programming: Classes, Inheritance, Polymorphism',
      'Networking: OSI Model, TCP/IP, HTTP, DNS',
    ],
  },
  {
    subject: 'Mathematics',
    icon: CalculatorIcon,
    topics: [
      'Calculus: Limits, Derivatives, Integrals',
      'Algebra: Matrices, Determinants, Linear Equations',
      'Trigonometry: Identities, Equations, Graphs',
      'Statistics: Probability, Distributions, Hypothesis Testing',
      'Coordinate Geometry: Lines, Circles, Conics',
    ],
  },
  {
    subject: 'Physics',
    icon: AtomIcon,
    topics: [
      'Mechanics: Motion, Forces, Energy, Momentum',
      'Electricity & Magnetism: Fields, Circuits, Induction',
      'Waves & Oscillations: SHM, Sound, Light',
      'Modern Physics: Photoelectric, Atoms, Semiconductors',
      'Thermodynamics: Laws, Heat, Engines',
    ],
  },
]

function CalculatorIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  )
}

function AtomIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1" />
      <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" />
      <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" />
    </svg>
  )
}

export default function GeneratePage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('topic')
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [questionCount, setQuestionCount] = useState([10])
  const [notes, setNotes] = useState('')
  const [includeExplanations, setIncludeExplanations] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveSubject = subject === '__custom__' ? customSubject : subject

  const canGenerate =
    ((activeTab === 'topic' && topic.trim().length > 0) ||
      (activeTab === 'notes' && notes.trim().length > 30)) &&
    (effectiveSubject?.trim().length ?? 0) > 0

  const aiGenerate = trpc.imports.aiGenerate.useMutation({
    onSuccess: (data) => {
      router.push(`/ai-studio/review/${data.id}`)
    },
    onError: (err) => {
      setError(err.message)
      setIsGenerating(false)
    },
  })

  const handleGenerate = async () => {
    if (!canGenerate) return
    setIsGenerating(true)
    setError(null)
    try {
      await aiGenerate.mutateAsync({
        subject: effectiveSubject!,
        topic: activeTab === 'topic' ? topic : notes,
        difficulty: (difficulty === 'MIXED' ? 'MEDIUM' : difficulty) as 'EASY' | 'MEDIUM' | 'HARD',
        count: questionCount[0],
      })
    } catch {
      // error handled by mutation onError
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/ai-studio')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">AI Question Generator</h1>
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Generate high-quality MCQs from any topic, chapter, or your own study notes.
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="topic">
            <BookOpen className="h-4 w-4 mr-2" />
            From Topic
          </TabsTrigger>
          <TabsTrigger value="notes">
            <Layers className="h-4 w-4 mr-2" />
            From My Notes
          </TabsTrigger>
        </TabsList>

        {/* Topic Tab */}
        <TabsContent value="topic" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Topic & Subject</CardTitle>
              <CardDescription>
                Choose what you want to study. AI will create unique, syllabus-aligned MCQs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_SUGGESTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">+ Custom subject…</SelectItem>
                    </SelectContent>
                  </Select>
                  {subject === '__custom__' && (
                    <Input
                      placeholder="Enter subject name"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Chapter / Unit (optional)</Label>
                  <Input
                    placeholder="e.g. Chapter 5 — Trigonometric Identities"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Topic to generate questions about</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Newton's laws of motion with examples of friction, inclined planes, and pulleys."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              {/* Topic Quick Templates */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Quick-start templates</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {TOPIC_TEMPLATES.map((tpl) => {
                    const Icon = tpl.icon
                    return (
                      <Card
                        key={tpl.subject}
                        className="cursor-pointer transition-all hover:border-primary/60 hover:shadow-sm"
                        onClick={() => {
                          setSubject(tpl.subject)
                          setTopic(tpl.topics[0])
                        }}
                      >
                        <CardContent className="pt-4 px-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <p className="font-medium text-sm">{tpl.subject}</p>
                          </div>
                          <div className="space-y-1">
                            {tpl.topics.slice(0, 3).map((t) => (
                              <p key={t} className="text-xs text-muted-foreground line-clamp-1">
                                • {t}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paste Your Notes</CardTitle>
              <CardDescription>
                Paste any text (study notes, summaries, chapters) and AI will turn it into MCQs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_SUGGESTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Custom subject…</SelectItem>
                  </SelectContent>
                </Select>
                {subject === '__custom__' && (
                  <Input
                    placeholder="Enter subject name"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Your notes / source text</Label>
                  <span className="text-xs text-muted-foreground">
                    {notes.length} chars • recommended 500+
                  </span>
                </div>
                <Textarea
                  rows={12}
                  placeholder="Paste your notes here. The more context you provide, the better the generated questions. Include definitions, examples, formulas, and explanations."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="font-mono text-sm leading-relaxed"
                />
                {notes.length > 0 && notes.length < 300 && (
                  <div className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-500">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Add more detail for better results. Include specific terms, examples, and
                      edge cases.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shared Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Settings</CardTitle>
            <CardDescription>
              Fine-tune the number, difficulty, and style of your MCQs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Number of questions</Label>
                  <Badge variant="secondary">{questionCount[0]}</Badge>
                </div>
                <Slider
                  value={questionCount}
                  onValueChange={setQuestionCount}
                  min={5}
                  max={50}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5</span>
                  <span>25</span>
                  <span>50</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50 border border-border">
              <input
                id="include-exp"
                type="checkbox"
                checked={includeExplanations}
                onChange={(e) => setIncludeExplanations(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-gray-300"
              />
              <div>
                <Label htmlFor="include-exp" className="cursor-pointer">
                  Include AI explanations for each correct answer
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended — explanations help you learn from every question.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between border-t pt-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1 text-xs">
                <Zap className="h-3 w-3" />
                Estimated time: ~{Math.max(3, Math.ceil(questionCount[0] / 4))}s
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <Brain className="h-3 w-3" />
                Uses GPT-powered generation
              </Badge>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/ai-studio')}>
                Cancel
              </Button>
              <Button
                disabled={!canGenerate || isGenerating}
                onClick={handleGenerate}
                className="min-w-[180px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate {questionCount[0]} Questions
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </Tabs>
    </div>
  )
}
