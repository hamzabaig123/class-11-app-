'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Clock, Flag, Bookmark, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'

export default function PracticeSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const { data: session, isLoading, refetch } = trpc.practice.getSession.useQuery({ sessionId })

  const answerMutation = trpc.practice.answer.useMutation({
    onSuccess: () => {
      setShowExplanation(true)
      refetch()
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const completeSession = trpc.practice.complete.useMutation({
    onSuccess: () => toast({ title: 'Session completed!' }),
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  useEffect(() => {
    if (session) setCurrentIndex(session.currentIndex)
  }, [session?.currentIndex])

  const currentQuestion = session?.questions[currentIndex]
  const isLast = currentIndex >= (session?.questions.length || 0) - 1

  const handleSubmit = useCallback(() => {
    if (!selectedOption || !currentQuestion || !session) return
    answerMutation.mutate({
      sessionId,
      sessionQuestionId: currentQuestion.id,
      clientEventId: `${sessionId}-${currentQuestion.id}-${Date.now()}`,
      sequence: currentIndex,
      selectedLabel: selectedOption as 'A' | 'B' | 'C' | 'D',
      timeSpentMs: 30000,
      hintUsed: showHint,
    })
  }, [selectedOption, currentQuestion, sessionId, showHint, answerMutation, currentIndex])

  const handleNext = () => {
    setSelectedOption(null)
    setShowExplanation(false)
    setShowHint(false)
    if (isLast) {
      completeSession.mutate({ sessionId })
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  if (isLoading || !session) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{session.title}</h1>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {session.questionCount}
          </span>
        </div>
        {session.timeLimitSeconds && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {session.timeLimitSeconds}s
          </div>
        )}
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-burgundy-600 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / session.questionCount) * 100}%` }}
        />
      </div>

      {currentQuestion && (
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

            {showHint && currentQuestion.hint && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
                💡 {currentQuestion.hint}
              </div>
            )}

            <div className="space-y-3">
              {currentQuestion.options.map((option: any) => (
                <button
                  key={option.label}
                  onClick={() => !showExplanation && setSelectedOption(option.label)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${selectedOption === option.label ? 'border-burgundy-600 bg-burgundy-50' : 'hover:bg-accent/50'}`}
                >
                  <span className="font-medium mr-3">{option.label}.</span>
                  {option.text}
                </button>
              ))}
            </div>

            {showExplanation && currentQuestion.explanation && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-1">Explanation</p>
                <p className="text-sm text-green-600">{currentQuestion.explanation}</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              {!showExplanation ? (
                <Button onClick={handleSubmit} disabled={!selectedOption}>
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {isLast ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-1">
        {session.questions.map((q: any, i: number) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={`w-8 h-8 rounded text-xs font-medium ${i === currentIndex ? 'bg-burgundy-600 text-white' : q.isCorrect === true ? 'bg-green-100 text-green-700' : q.isCorrect === false ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
