'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Clock, Brain, Target, BookOpen, Shuffle, ChevronRight, Zap, Award, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'

type PracticeMode = 'QUICK' | 'TOPIC' | 'MISTAKES' | 'REVIEW' | 'MOCK' | 'COLLECTION'
type Step = 1 | 2 | 3 | 4

export default function PracticeSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [mode, setMode] = useState<PracticeMode>('QUICK')
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [chapterId, setChapterId] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<string>('MEDIUM')
  const [count, setCount] = useState(10)
  const [timeLimit, setTimeLimit] = useState(0)
  const [shuffle, setShuffle] = useState(true)

  const { data: subjects } = trpc.subjects.list.useQuery()
  const { data: chapters } = trpc.chapters.list.useQuery({ subjectId: subjectId || '' }, { enabled: !!subjectId })

  const createSession = trpc.practice.createSession.useMutation({
    onSuccess: (session) => { router.push(`/practice/${session.sessionId}`) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const handleStart = () => {
    createSession.mutate({
      mode,
      subjectId: subjectId || undefined,
      chapterId: chapterId || undefined,
      difficulty: difficulty as any,
      count,
      timeLimitSeconds: timeLimit || undefined,
      randomize: shuffle,
    })
  }

  const canProceed = () => {
    if (step === 1) return mode === 'QUICK' || mode === 'MISTAKES' || mode === 'REVIEW' || (mode === 'TOPIC' && subjectId)
    return true
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Start Practice</h1>
        <p className="text-muted-foreground">Configure your practice session</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-burgundy-600' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1: Choose Content */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { id: 'QUICK', label: 'Quick Practice', desc: 'Random questions', icon: Zap },
                { id: 'TOPIC', label: 'Topic Practice', desc: 'Specific subject/topic', icon: Target },
                { id: 'MISTAKES', label: 'Review Mistakes', desc: 'Wrong answers', icon: AlertTriangle },
                { id: 'REVIEW', label: 'Due Review', desc: 'Scheduled revision', icon: Clock },
                { id: 'MOCK', label: 'Mock Test', desc: 'Timed exam', icon: Award },
                { id: 'COLLECTION', label: 'Collection', desc: 'Saved set', icon: BookOpen },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as PracticeMode)}
                  className={`p-4 rounded-lg border text-left transition-all ${mode === m.id ? 'border-burgundy-600 bg-burgundy-50' : 'hover:bg-accent/50'}`}
                >
                  <m.icon className={`h-5 w-5 mb-2 ${mode === m.id ? 'text-burgundy-600' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>

            {(mode === 'TOPIC') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Subject</Label>
                  <Select value={subjectId || ''} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chapter</Label>
                  <Select value={chapterId || ''} onValueChange={setChapterId}>
                    <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                    <SelectContent>
                      {chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Question Count</Label>
                <Input type="number" min={1} max={100} value={count} onChange={e => setCount(Number(e.target.value))} />
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
              <div>
                <Label>Time Limit (minutes)</Label>
                <Input type="number" min={0} value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} placeholder="0 = no limit" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 p-2">
                  <input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} className="rounded" />
                  <span className="text-sm">Shuffle questions</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Start */}
      {step >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Mode:</span><span className="text-sm font-medium">{mode}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Questions:</span><span className="text-sm font-medium">{count}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Difficulty:</span><span className="text-sm font-medium">{difficulty}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Time Limit:</span><span className="text-sm font-medium">{timeLimit ? `${timeLimit} min` : 'None'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Shuffle:</span><span className="text-sm font-medium">{shuffle ? 'Yes' : 'No'}</span></div>
            </div>
            <Button size="lg" className="w-full" onClick={handleStart} disabled={createSession.isPending}>
              <Play className="h-5 w-5 mr-2" />
              {createSession.isPending ? 'Creating Session...' : 'Start Practice'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1) as Step)} disabled={step === 1}>
          Back
        </Button>
        {step < 3 && (
          <Button onClick={() => setStep(Math.min(4, step + 1) as Step)} disabled={!canProceed()}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
