'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap,
  BookOpen,
  Target,
  RotateCcw,
  FolderOpen,
  Timer,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Hash,
  Shuffle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import type { PracticeMode } from '@/types/practice'

interface ModeOption {
  mode: PracticeMode
  label: string
  description: string
  icon: React.ElementType
  color: string
}

const modes: ModeOption[] = [
  {
    mode: 'QUICK',
    label: 'Quick Practice',
    description: 'Short session for daily progress',
    icon: Zap,
    color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
  },
  {
    mode: 'SUBJECT',
    label: 'Subject Practice',
    description: 'Focus on one subject or topic',
    icon: BookOpen,
    color: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
  },
  {
    mode: 'WEAK',
    label: 'Weak Areas',
    description: 'Improve low-accuracy areas',
    icon: Target,
    color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
  },
  {
    mode: 'REVIEW',
    label: 'Due Review',
    description: 'Complete scheduled revision',
    icon: RotateCcw,
    color: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
  },
  {
    mode: 'COLLECTION',
    label: 'Collection Practice',
    description: 'Practice a custom question group',
    icon: FolderOpen,
    color: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100',
  },
  {
    mode: 'MOCK',
    label: 'Mock Test',
    description: 'Simulate exam conditions',
    icon: Timer,
    color: 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100',
  },
  {
    mode: 'UNANSWERED',
    label: 'Unanswered',
    description: 'Try questions you haven\'t attempted',
    icon: AlertTriangle,
    color: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
  },
]

export default function PracticeSetupPage() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('QUICK')
  const [count, setCount] = useState(10)
  const [randomize, setRandomize] = useState(true)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [timeLimit, setTimeLimit] = useState<number | ''>('')
  const [customTitle, setCustomTitle] = useState('')

  const { data: subjects } = trpc.subjects.list.useQuery()
  const { data: collections } = trpc.collections.list.useQuery({
    page: 1,
    pageSize: 50,
    sort: 'recent',
  })

  const createSession = trpc.practice.createSession.useMutation({
    onSuccess: (data) => {
      router.push(`/practice/${data.sessionId}`)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleStart = () => {
    const config: any = {
      mode: selectedMode,
      count,
      randomize,
    }

    if (customTitle) config.title = customTitle
    if (timeLimit) config.timeLimitSeconds = timeLimit * 60
    if (selectedSubjectId) config.subjectId = selectedSubjectId
    if (selectedMode === 'COLLECTION' && selectedCollectionId) {
      config.collectionId = selectedCollectionId
    }

    createSession.mutate(config)
  }

  const selectedModeData = modes.find(m => m.mode === selectedMode)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Start Practice</h1>
        <p className="text-muted-foreground mt-1">
          Choose how you want to practice today
        </p>
      </div>

      {/* Mode Selection */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Practice Mode</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => {
            const isSelected = selectedMode === mode.mode
            return (
              <button
                key={mode.mode}
                onClick={() => setSelectedMode(mode.mode)}
                className={cn(
                  'text-left p-4 rounded-xl border-2 transition-all duration-150',
                  isSelected
                    ? 'border-burgundy-500 ring-2 ring-burgundy-200 bg-burgundy-50/50'
                    : mode.color,
                )}
              >
                <div className="flex items-start gap-3">
                  <mode.icon className={cn('h-5 w-5 mt-0.5 shrink-0', isSelected ? 'text-burgundy-600' : '')} />
                  <div>
                    <p className={cn('font-medium', isSelected ? 'text-burgundy-700' : '')}>{mode.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{mode.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
          <CardDescription>
            Customize your {selectedModeData?.label} session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Custom Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Session Title (optional)</Label>
            <Input
              id="title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={`e.g., "Algebra practice" or "Chapter 5 review"`}
            />
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Number of Questions
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-24"
              />
              <div className="flex gap-2">
                {[5, 10, 20, 50].map((n) => (
                  <Button
                    key={n}
                    variant={count === n ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCount(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Filter */}
          {(selectedMode === 'QUICK' || selectedMode === 'SUBJECT' || selectedMode === 'MOCK') && subjects && subjects.length > 0 && (
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s._count.questions} questions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Collection Selector */}
          {selectedMode === 'COLLECTION' && collections && (
            <div className="space-y-2">
              <Label>Collection</Label>
              <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.questionCount} questions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Limit */}
          {(selectedMode === 'MOCK' || selectedMode === 'QUICK') && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Limit (minutes, optional)
              </Label>
              <Input
                type="number"
                min={1}
                max={300}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="No time limit"
                className="w-40"
              />
            </div>
          )}

          {/* Randomize */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Randomize order
              </Label>
              <p className="text-sm text-muted-foreground">
                Shuffle question order each session
              </p>
            </div>
            <Switch checked={randomize} onCheckedChange={setRandomize} />
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <div className="flex justify-end">
        <Button
          size="xl"
          onClick={handleStart}
          loading={createSession.isLoading}
          disabled={
            (selectedMode === 'COLLECTION' && !selectedCollectionId)
          }
          className="gap-2"
        >
          <Sparkles className="h-5 w-5" />
          Start {selectedModeData?.label}
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
