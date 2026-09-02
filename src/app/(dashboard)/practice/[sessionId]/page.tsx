'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import { PracticeHeader } from '@/components/practice/PracticeHeader'
import { QuestionPanel } from '@/components/practice/QuestionPanel'
import { PracticeControls } from '@/components/practice/PracticeControls'
import { ExplanationCard } from '@/components/practice/ExplanationCard'
import { SessionOverview } from '@/components/practice/SessionOverview'
import { CompletionDialog } from '@/components/practice/CompletionDialog'
import { ResultsPage } from '@/components/practice/ResultsPage'
import type { PracticeSession, SafeQuestion, ConfidenceLevel } from '@/types/practice'

export default function PracticeSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())

  const { data: session, isLoading, refetch } = trpc.practice.getSession.useQuery({ sessionId })

  const answerMutation = trpc.practice.answer.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const skipMutation = trpc.practice.skip.useMutation({
    onSuccess: (data) => {
      setCurrentIndex(data.nextPosition)
      setIsSubmitted(false)
      setShowHint(false)
      setQuestionStartTime(Date.now())
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const completeMutation = trpc.practice.complete.useMutation({
    onSuccess: () => {
      setShowResults(true)
      setCompletionDialogOpen(false)
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const abandonMutation = trpc.practice.abandon.useMutation({
    onSuccess: () => {
      router.push('/practice')
    },
  })

  const { data: results } = trpc.practice.results.useQuery(
    { sessionId },
    { enabled: showResults }
  )

  useEffect(() => {
    if (session) {
      setCurrentIndex(session.currentIndex)
      setIsSubmitted(
        session.questions[session.currentIndex]?.status === 'ANSWERED'
      )
    }
  }, [session?.currentIndex, session?.id])

  const currentQuestion = session?.questions[currentIndex]
  const isLast = currentIndex >= (session?.questions.length || 0) - 1
  const unansweredCount = session?.questions.filter(q => q.status === 'UNANSWERED').length ?? 0
  const skippedCount = session?.questions.filter(q => q.status === 'SKIPPED').length ?? 0

  const handleSubmit = useCallback((selectedOption: string, confidence?: ConfidenceLevel, hintUsed?: boolean) => {
    if (!currentQuestion || !session) return
    const timeSpentMs = Date.now() - questionStartTime
    answerMutation.mutate({
      sessionId,
      sessionQuestionId: currentQuestion.id,
      clientEventId: `${sessionId}-${currentQuestion.id}-${Date.now()}`,
      sequence: currentIndex,
      selectedLabel: selectedOption as 'A' | 'B' | 'C' | 'D',
      timeSpentMs,
      confidence,
      hintUsed: hintUsed ?? false,
    })
    setIsSubmitted(true)
  }, [currentQuestion, session, questionStartTime, answerMutation, sessionId, currentIndex])

  const handleNext = useCallback(() => {
    setIsSubmitted(false)
    setShowHint(false)
    if (isLast) {
      setCompletionDialogOpen(true)
    } else {
      setCurrentIndex(currentIndex + 1)
      setQuestionStartTime(Date.now())
    }
  }, [isLast, currentIndex])

  const handlePrevious = useCallback(() => {
    setCurrentIndex(Math.max(0, currentIndex - 1))
    setIsSubmitted(true)
    setShowHint(false)
  }, [currentIndex])

  const handleSkip = useCallback(() => {
    if (!currentQuestion || !session) return
    skipMutation.mutate({ sessionId, questionId: currentQuestion.id })
  }, [currentQuestion, session, skipMutation, sessionId])

  const handleNavigate = useCallback((position: number) => {
    setCurrentIndex(position)
    setIsSubmitted(session?.questions[position]?.status === 'ANSWERED')
    setShowHint(false)
  }, [session])

  const handleFinish = useCallback(() => {
    completeMutation.mutate({ sessionId })
  }, [completeMutation, sessionId])

  const handleExit = useCallback(() => {
    abandonMutation.mutate({ sessionId })
  }, [abandonMutation, sessionId])

  if (isLoading || !session) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 p-4">
        <div className="h-14 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (showResults && results) {
    return <ResultsPage results={results} />
  }

  const feedback = isSubmitted && currentQuestion?.isCorrect !== null
    ? {
        isCorrect: currentQuestion.isCorrect ?? false,
        correctLabel: currentQuestion.selectedLabel ?? '',
        explanation: currentQuestion.explanation ?? null,
      }
    : null

  return (
    <div className="min-h-screen flex flex-col">
      <PracticeHeader
        session={session}
        onExit={handleExit}
      />

      <div className="flex-1 flex">
        {/* Main Content */}
        <div className="flex-1 max-w-3xl mx-auto w-full p-4 space-y-4">
          {currentQuestion && (
            <>
              <QuestionPanel
                question={currentQuestion}
                onSubmit={handleSubmit}
                onRevealHint={() => setShowHint(true)}
                isSubmitted={isSubmitted}
                isSubmitting={answerMutation.isPending}
                feedback={feedback}
                hint={showHint ? currentQuestion.hint : null}
              />

              {isSubmitted && feedback && (
                <ExplanationCard
                  isCorrect={feedback.isCorrect}
                  correctLabel={feedback.correctLabel}
                  selectedLabel={currentQuestion.selectedLabel ?? ''}
                  explanation={feedback.explanation}
                />
              )}

              <PracticeControls
                hasPrevious={currentIndex > 0}
                hasNext={!isLast}
                isSubmitted={isSubmitted}
                isSubmitting={answerMutation.isPending}
                selectedOption={currentQuestion.selectedLabel}
                isLastQuestion={isLast}
                unansweredCount={unansweredCount}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onSkip={handleSkip}
                onSubmit={() => {
                  if (currentQuestion.selectedLabel) {
                    handleSubmit(currentQuestion.selectedLabel)
                  }
                }}
                onFinish={handleFinish}
              />
            </>
          )}
        </div>

        {/* Sidebar - Desktop only */}
        <div className="hidden lg:block w-64 border-l p-4">
          <SessionOverview
            session={session}
            onNavigate={handleNavigate}
          />
        </div>
      </div>

      <CompletionDialog
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        unansweredCount={unansweredCount}
        skippedCount={skippedCount}
        onComplete={handleFinish}
        onGoBack={() => setCompletionDialogOpen(false)}
        isCompleting={completeMutation.isPending}
      />
    </div>
  )
}
