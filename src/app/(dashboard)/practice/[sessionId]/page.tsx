'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Clock, Flag, Bookmark, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'

export default function PracticeSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [answers, setAnswers] = useState<Record<string, { selected: string; isCorrect: boolean; explanation?: string | null }>>({})
  const [clientSequence, setClientSequence] = useState(0)

  const { data: session, isLoading, refetch } = trpc.practice.getSession.useQuery({ sessionId })

  const startSession = trpc.practice.startSession.useMutation({
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const answerMutation = trpc.practice.answer.useMutation({
    onSuccess: (data) => {
      if (!data.alreadyAnswered) {
        setAnswers(prev => ({
          ...prev,
          [session?.questions[currentIndex?.id || 0]?.id || '']: {
            selected: data.isCorrect ? 'correct' : 'incorrect',
            isCorrect: data.isCorrect,
            explanation: data.explanation,
          },
        }))
      }
      setShowExplanation(true)
      refetch()
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const completeMutation = trpc.practice.complete.useMutation({
    onSuccess: () => {
      toast({ title: 'Session completed!' })
      refetch()
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const abandonMutation = trpc.practice.abandon.useMutation({
    onSuccess: () => router.push('/dashboard'),
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  // Auto-start session
  useEffect(() => {
    if (session?.status === 'READY' && !startSession.isSuccess) {
      startSession.mutate({ sessionId })
    }
  }, [session, sessionId, startSession])

  useEffect(() => {
    if (session) setCurrentIndex(session.currentIndex)
  }, [session?.currentIndex])

  const currentQuestion = session?.questions[currentIndex]
  const isLast = currentIndex >= (session?.questions.length || 0) - 1

  const handleSubmit = useCallback(() => {
    if (!selectedOption || !currentQuestion || !session) return

    const newSeq = clientSequence + 1
    setClientSequence(newSeq)

    answerMutation.mutate({
      sessionId,
      sessionQuestionId: currentQuestion.id,
      clientEventId: `${sessionId}-${currentQuestion.id}-${newSeq}`,
      sequence: newSeq,
      selectedLabel: selectedOption as 'A' | 'B' | 'C' | 'D',
      timeSpentMs: 30000,
      hintUsed: showHint,
    })
  }, [selectedOption, currentQuestion, session, sessionId, clientSequence, showHint, answerMutation])

  const handleNext = useCallback(() => {
    setSelectedOption(null)
    setShowExplanation(false)
    setShowHint(false)
    if (isLast && session) {
      completeMutation.mutate({ sessionId: session.id })
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }, [isLast, session, sessionId, currentIndex, completeMutation])

  const handleExit = useCallback(() => {
    abandonMutation.mutate({ sessionId })
  }, [sessionId, abandonMutation])

  if (isLoading || !session) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-lg font-medium">No questions in this session</p>
        <Button onClick={() => router.push('/practice/new')} className="mt-4">Start New Session</Button>
      </div>
    )
  }

  const currentAnswer = answers[currentQuestion.id]

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{session.title}</h1>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {session.questionCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {session.timeLimitSeconds && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {session.timeLimitSeconds}s
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleExit}>Exit</Button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-burgundy-600 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / session.questionCount) * 100}%` }}
        />
      </div>

      {/* Question */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{currentQuestion.subject?.name}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowHint(!showHint)}>
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Flag className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-lg font-medium">{currentQuestion.text}</p>

          {/* Hint */}
          {showHint && currentQuestion.hint && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
              💡 {currentQuestion.hint}
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map(option => {
              const isSelected = selectedOption === option.label
              const isAnswered = currentAnswer !== undefined
              const isCorrectAnswer = isAnswered && currentAnswer?.isCorrect && isSelected
              const isWrongAnswer = isAnswered && !currentAnswer?.isCorrect && isSelected

              return (
                <button
                  key={option.label}
                  onClick={() => !showExplanation && setSelectedOption(option.label)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    isCorrectAnswer ? 'border-green-600 bg-green-50' :
                    isWrongAnswer ? 'border-red-600 bg-red-50' :
                    isSelected ? 'border-burgundy-600 bg-burgundy-50' :
                    'hover:bg-accent/50'
                  }`}
                >
                  <span className="font-medium mr-3">{option.label}.</span>
                  {option.text}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (currentAnswer?.explanation || currentQuestion.explanation) && (
            <div className={`p-4 rounded-lg ${currentAnswer?.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium mb-1 ${currentAnswer?.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {currentAnswer?.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p className={`text-sm ${currentAnswer?.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {currentAnswer?.explanation || currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            {!showExplanation ? (
              <Button onClick={handleSubmit} disabled={!selectedOption || answerMutation.isLoading}>
                {answerMutation.isLoading ? 'Submitting...' : 'Submit Answer'}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {isLast ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Navigator */}
      <div className="flex flex-wrap gap-1">
        {session.questions.map((q, i) => {
          const answered = answers[q.id]
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded text-xs font-medium ${
                i === currentIndex ? 'bg-burgundy-600 text-white' :
                answered?.isCorrect ? 'bg-green-100 text-green-700' :
                answered?.isCorrect === false ? 'bg-red-100 text-red-700' :
                'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
