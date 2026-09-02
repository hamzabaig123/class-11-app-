'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import { PracticeHeader } from '@/components/practice/PracticeHeader'
import { QuestionPanel } from '@/components/practice/QuestionPanel'
import { ExplanationCard } from '@/components/practice/ExplanationCard'
import { SessionOverview } from '@/components/practice/SessionOverview'
import { PracticeControls } from '@/components/practice/PracticeControls'
import { CompletionDialog } from '@/components/practice/CompletionDialog'
import { ResultsPage } from '@/components/practice/ResultsPage'
import type { ConfidenceLevel } from '@/types/practice'
import { Button } from '@/components/ui/button'
import { PanelRightClose, PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackData {
  isCorrect: boolean
  correctLabel: string
  explanation: string | null
  attemptId: string
}

export default function PracticeSessionPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const { sessionId } = params
  const [showOverview, setShowOverview] = useState(true)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [localAnswers, setLocalAnswers] = useState<Record<string, FeedbackData>>({})
  const [localHints, setLocalHints] = useState<Record<string, string | null>>({})
  const [currentIdx, setCurrentIdx] = useState<number | null>(null)
  const [clientSequence, setClientSequence] = useState(0)

  const { data: session, isLoading, error } = trpc.practice.getSession.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  )

  const { data: results } = trpc.practice.results.useQuery(
    { sessionId },
    {
      enabled: !!sessionId && session?.status === 'COMPLETED',
    }
  )

  const startSession = trpc.practice.startSession.useMutation({
    onSuccess: () => {
      // Session started, now we can answer
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const answerMutation = trpc.practice.answer.useMutation({
    onSuccess: (data) => {
      if (session) {
        const currentQuestion = session.questions[currentIdx ?? session.currentIndex]
        if (currentQuestion && !data.alreadyAnswered) {
          setLocalAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: {
              isCorrect: data.isCorrect,
              correctLabel: data.correctLabel,
              explanation: data.explanation,
              attemptId: data.attemptId,
            },
          }))
        }
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const skipMutation = trpc.practice.skip.useMutation({
    onSuccess: (data) => {
      if (session) {
        const nextIdx = data.nextPosition
        if (nextIdx < session.questionCount) {
          setCurrentIdx(nextIdx)
        }
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const completeMutation = trpc.practice.complete.useMutation({
    onSuccess: () => {
      setCompletionDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const abandonMutation = trpc.practice.abandon.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
    },
  })

  const revealHint = trpc.practice.revealHint.useMutation({
    onSuccess: (data) => {
      if (session) {
        const currentQuestion = session.questions[session.currentIndex]
        if (currentQuestion) {
          setLocalHints(prev => ({
            ...prev,
            [currentQuestion.id]: data.hint,
          }))
        }
      }
    },
  })

  // Auto-start session on first load
  useEffect(() => {
    if (session && session.status === 'READY' && !startSession.isSuccess) {
      startSession.mutate({ sessionId })
    }
  }, [session, sessionId, startSession])

  useEffect(() => {
    if (session && currentIdx === null) {
      setCurrentIdx(session.currentIndex)
    }
  }, [session, currentIdx])

  useEffect(() => {
    if (results) {
      router.replace(`/practice/${sessionId}`)
    }
  }, [results, sessionId])

  const handleNavigate = useCallback((position: number) => {
    setCurrentIdx(position)
  }, [])

  const handleSubmitAnswer = useCallback((selectedOption: string, confidence?: ConfidenceLevel, hintUsed?: boolean) => {
    if (!session) return
    const question = session.questions[currentIdx ?? session.currentIndex]
    if (!question) return

    const timeSpentMs = question.timeSpentMs > 0 ? question.timeSpentMs : 5000
    const newSequence = clientSequence + 1
    setClientSequence(newSequence)

    answerMutation.mutate({
      sessionId,
      sessionQuestionId: question.id,
      clientEventId: `${sessionId}-${question.id}-${newSequence}`,
      sequence: newSequence,
      selectedLabel: selectedOption as 'A' | 'B' | 'C' | 'D',
      timeSpentMs,
      confidence: confidence as 'unsure' | 'medium' | 'confident' | undefined,
      hintUsed: hintUsed ?? false,
    })
  }, [session, currentIdx, sessionId, answerMutation, clientSequence])

  const handleSkip = useCallback(() => {
    if (!session) return
    const question = session.questions[currentIdx ?? session.currentIndex]
    if (!question) return

    skipMutation.mutate({ sessionId, questionId: question.id })
  }, [session, currentIdx, sessionId, skipMutation])

  const handleNext = useCallback(() => {
    if (!session) return
    const idx = currentIdx ?? session.currentIndex
    if (idx < session.questionCount - 1) {
      setCurrentIdx(idx + 1)
    }
  }, [session, currentIdx])

  const handlePrevious = useCallback(() => {
    if (!session) return
    const idx = currentIdx ?? session.currentIndex
    if (idx > 0) {
      setCurrentIdx(idx - 1)
    }
  }, [session, currentIdx])

  const handleFinish = useCallback(() => {
    const unanswered = session?.questions.filter(q => q.status === 'UNANSWERED').length ?? 0
    const skipped = session?.questions.filter(q => q.status === 'SKIPPED').length ?? 0

    if (unanswered > 0 || skipped > 0) {
      setCompletionDialogOpen(true)
    } else {
      completeMutation.mutate({ sessionId })
    }
  }, [session, sessionId, completeMutation])

  const handleCompleteConfirm = useCallback(() => {
    completeMutation.mutate({ sessionId })
  }, [sessionId, completeMutation])

  const handleExit = useCallback(() => {
    abandonMutation.mutate({ sessionId })
  }, [sessionId, abandonMutation])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-burgundy-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading practice session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Session not found</p>
          <p className="text-muted-foreground">This practice session may have expired or doesn't exist.</p>
          <Button onClick={() => router.push('/practice/new')}>Start New Session</Button>
        </div>
      </div>
    )
  }

  if (session.status === 'COMPLETED' && results) {
    return <ResultsPage results={results} />
  }

  const idx = currentIdx ?? session.currentIndex
  const currentQuestion = session.questions[idx]
  const isSubmitted = currentQuestion ? localAnswers[currentQuestion.id] !== undefined : false
  const feedback = currentQuestion ? localAnswers[currentQuestion.id] : null
  const hint = currentQuestion ? localHints[currentQuestion.id] : null
  const isLastQuestion = idx >= session.questionCount - 1
  const hasPrevious = idx > 0
  const hasNext = idx < session.questionCount - 1

  if (!currentQuestion) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">No questions in this session</p>
          <Button onClick={() => router.push('/practice/new')}>Start New Session</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col -m-4 lg:-m-6 pt-14 lg:pt-0">
      <PracticeHeader session={session} onExit={handleExit} />

      <div className="flex-1 flex">
        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            <QuestionPanel
              question={currentQuestion}
              onSubmit={handleSubmitAnswer}
              onRevealHint={() => revealHint.mutate({ sessionId, questionId: currentQuestion.id })}
              isSubmitted={isSubmitted}
              isSubmitting={answerMutation.isLoading}
              feedback={feedback}
              hint={hint}
            />

            {feedback && (
              <ExplanationCard
                isCorrect={feedback.isCorrect}
                correctLabel={feedback.correctLabel}
                selectedLabel={currentQuestion.selectedLabel || ''}
                explanation={feedback.explanation}
              />
            )}

            <PracticeControls
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              isSubmitted={isSubmitted}
              isSubmitting={answerMutation.isLoading}
              selectedOption={currentQuestion.selectedLabel}
              isLastQuestion={isLastQuestion}
              unansweredCount={session.questions.filter(q => q.status === 'UNANSWERED').length}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSkip={handleSkip}
              onSubmit={() => {
                if (currentQuestion.selectedLabel) {
                  handleSubmitAnswer(currentQuestion.selectedLabel)
                }
              }}
              onFinish={handleFinish}
            />
          </div>
        </div>

        {/* Session Overview Sidebar */}
        <div className={cn(
          'hidden lg:block border-l bg-card/50 overflow-y-auto transition-all duration-200',
          showOverview ? 'w-72 p-4' : 'w-10 p-2'
        )}>
          <button
            onClick={() => setShowOverview(!showOverview)}
            className="text-muted-foreground hover:text-foreground mb-2"
            aria-label={showOverview ? 'Collapse overview' : 'Expand overview'}
          >
            {showOverview ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </button>
          {showOverview && (
            <SessionOverview
              session={session}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </div>

      {/* Mobile Session Overview Toggle */}
      <div className="lg:hidden fixed bottom-20 right-4 z-20">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setShowOverview(!showOverview)}
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Session Overview Drawer */}
      {showOverview && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowOverview(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 bg-card p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Session Progress</h3>
              <button onClick={() => setShowOverview(false)} className="text-muted-foreground">
                ✕
              </button>
            </div>
            <SessionOverview
              session={session}
              onNavigate={(pos) => {
                handleNavigate(pos)
                setShowOverview(false)
              }}
            />
          </div>
        </div>
      )}

      <CompletionDialog
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        unansweredCount={session.questions.filter(q => q.status === 'UNANSWERED').length}
        skippedCount={session.questions.filter(q => q.status === 'SKIPPED').length}
        onComplete={handleCompleteConfirm}
        onGoBack={() => setCompletionDialogOpen(false)}
        isCompleting={completeMutation.isLoading}
      />
    </div>
  )
}
