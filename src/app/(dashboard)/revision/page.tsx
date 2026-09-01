'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, Play, Clock, BookCheck, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { formatTimeAgo, getDifficultyColor } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function RevisionPage() {
  const { data: dueQueue, isLoading, refetch } = trpc.revision.dueQueue.useQuery()
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const startSession = trpc.revision.startSession.useMutation({
    onSuccess: (session) => {
      setActiveSession(session.id)
      setCurrentQuestionIndex(0)
      setAnswers({})
    },
  })

  const submitAnswer = trpc.revision.submitAnswer.useMutation({
    onSuccess: () => {
      setCurrentQuestionIndex(prev => prev + 1)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const completeSession = trpc.revision.completeSession.useMutation({
    onSuccess: () => {
      setActiveSession(null)
      refetch()
      toast({ title: 'Session complete!', description: 'Great work on your revision.' })
    },
  })

  const handleStartRevision = () => {
    if (dueQueue && dueQueue.length > 0) {
      startSession.mutate({
        questionIds: dueQueue.map(item => item.question.id),
        title: 'Daily Revision',
        type: 'REVISION',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3 h-48" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Active session view
  if (activeSession && dueQueue) {
    const currentItem = dueQueue[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex >= dueQueue.length - 1

    if (!currentItem) {
      return (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Session Complete!</h2>
          <p className="text-muted-foreground mt-2">You've reviewed all due questions.</p>
          <Button onClick={() => completeSession.mutate({ sessionId: activeSession })} className="mt-4">
            Finish
          </Button>
        </div>
      )
    }

    const question = currentItem.question
    const selectedAnswer = answers[question.id]

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Revision Session</h1>
            <p className="text-muted-foreground">
              Question {currentQuestionIndex + 1} of {dueQueue.length}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setActiveSession(null)}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant={getDifficultyColor(question.difficulty) as any}>
                {question.difficulty}
              </Badge>
              {question.subject && (
                <Badge variant="secondary">{question.subject.name}</Badge>
              )}
              {question.topic && (
                <Badge variant="outline">{question.topic.name}</Badge>
              )}
            </div>

            <h2 className="text-xl font-medium">{question.text}</h2>

            <div className="space-y-3">
              {question.options.map(option => (
                <Button
                  key={option.id}
                  variant={selectedAnswer === option.label ? 'default' : 'outline'}
                  className="w-full justify-start gap-3"
onClick={() => !selectedAnswer && submitAnswer.mutate({
                      sessionId: activeSession,
                      questionId: question.id,
                      selectedLabel: option.label as 'A' | 'B' | 'C' | 'D',
                      timeSpentMs: 5000,
                    })}
                  disabled={!!selectedAnswer}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy-100 text-burgundy-700 font-medium">
                    {option.label}
                  </span>
                  <span className="flex-1 text-left">{option.text}</span>
                  {selectedAnswer === option.label && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </Button>
              ))}
            </div>

            {selectedAnswer && (question.answer as any) && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">
                    {selectedAnswer && (question.answer as any).correctLabel === selectedAnswer ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                {(question.answer as any)?.explanation && (
                  <p className="text-green-700 text-sm">{question?.answer?.explanation}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              {selectedAnswer && (
                <Button
                  onClick={() => isLastQuestion 
                    ? completeSession.mutate({ sessionId: activeSession })
                    : setCurrentQuestionIndex(prev => prev + 1)
                  }
                  size="lg"
                >
                  {isLastQuestion ? 'Finish Session' : 'Next Question'}
                  <RotateCcw className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Due queue view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revision</h1>
          <p className="text-muted-foreground">
            Review questions that are due today using spaced repetition
          </p>
        </div>
        {dueQueue && dueQueue.length > 0 && (
          <Button size="lg" onClick={handleStartRevision} className="gap-2">
            <Play className="h-5 w-5" />
            Start Revision ({dueQueue.length})
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Due Today</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-burgundy-600">{dueQueue?.length ?? 0}</div>
            <p className="text-muted-foreground text-sm">Questions ready for review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Mastered</CardTitle>
            <BookCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">0</div>
            <p className="text-muted-foreground text-sm">Questions mastered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Learning</CardTitle>
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">0</div>
            <p className="text-muted-foreground text-sm">In learning phase</p>
          </CardContent>
        </Card>
      </div>

      {dueQueue && dueQueue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RotateCcw className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-muted-foreground mt-1">No questions due for review today. Enjoy your break or add more questions.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/questions">Browse Questions</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Due Questions</CardTitle>
            <CardDescription>These questions are scheduled for review today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dueQueue?.slice(0, 10).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6 text-right">{index + 1}.</span>
                    <div>
                      <p className="font-medium line-clamp-1 max-w-md">{item.question.text}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={getDifficultyColor(item.question.difficulty) as any} className="text-xs">
                          {item.question.difficulty}
                        </Badge>
                        {item.question.subject && (
                          <Badge variant="secondary">{item.question.subject.name}</Badge>
                        )}
                        <span>Due: {formatTimeAgo(item.nextReviewAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {dueQueue && dueQueue.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  +{dueQueue.length - 10} more questions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}