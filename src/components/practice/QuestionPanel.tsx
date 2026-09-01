'use client'

import { useState, useCallback } from 'react'
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import type { SafeQuestion, ConfidenceLevel } from '@/types/practice'

interface QuestionPanelProps {
  question: SafeQuestion
  onSubmit: (selectedOption: string, confidence?: ConfidenceLevel, hintUsed?: boolean) => void
  onRevealHint: () => void
  isSubmitted: boolean
  isSubmitting: boolean
  feedback?: { isCorrect: boolean; correctLabel: string; explanation: string | null } | null
  hint?: string | null
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'EASY': return 'text-green-600 bg-green-50 border-green-200'
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'HARD': return 'text-red-600 bg-red-50 border-red-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function QuestionPanel({
  question,
  onSubmit,
  onRevealHint,
  isSubmitted,
  isSubmitting,
  feedback,
  hint,
}: QuestionPanelProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<ConfidenceLevel | undefined>()
  const [showConfidence, setShowConfidence] = useState(false)
  const [hintRevealed, setHintRevealed] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  const toggleBookmark = trpc.questions.list.useQuery({}, { enabled: false })

  const handleOptionSelect = useCallback((label: string) => {
    if (isSubmitted || isSubmitting) return
    setSelectedOption(label)
    setShowConfidence(true)
  }, [isSubmitted, isSubmitting])

  const handleSubmit = useCallback(() => {
    if (!selectedOption || isSubmitting) return
    onSubmit(selectedOption, confidence, hintRevealed)
  }, [selectedOption, confidence, hintRevealed, isSubmitting, onSubmit])

  const handleShowHint = useCallback(() => {
    setHintRevealed(true)
    onRevealHint()
  }, [onRevealHint])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, label: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOptionSelect(label)
    }
  }, [handleOptionSelect])

  return (
    <div className="space-y-6">
      {/* Subject/Topic Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {question.subject && (
          <span className="font-medium">{question.subject.name}</span>
        )}
        {question.subject && question.topic && <span>/</span>}
        {question.topic && (
          <span>{question.topic.name}</span>
        )}
        <Badge className={cn('ml-auto text-xs', getDifficultyColor(question.difficulty))}>
          {question.difficulty}
        </Badge>
      </div>

      {/* Question Text */}
      <div className="space-y-2">
        <p className="text-lg leading-relaxed whitespace-pre-wrap">{question.text}</p>
      </div>

      {/* Answer Options */}
      <div className="space-y-3" role="radiogroup" aria-label="Answer options">
        {question.options.map((option) => {
          const isSelected = selectedOption === option.label
          const isCorrectAnswer = feedback?.correctLabel === option.label
          const isWrongSelected = isSubmitted && isSelected && !feedback?.isCorrect
          const isCorrectShown = isSubmitted && isCorrectAnswer

          return (
            <div
              key={option.label}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, option.label)}
              onClick={() => handleOptionSelect(option.label)}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-150',
                !isSubmitted && !isSelected && 'border-border hover:border-burgundy-300 hover:bg-burgundy-50/50',
                !isSubmitted && isSelected && 'border-burgundy-500 bg-burgundy-50 ring-2 ring-burgundy-200',
                isSubmitted && isCorrectShown && 'border-green-500 bg-green-50',
                isSubmitted && isWrongSelected && 'border-red-500 bg-red-50',
                isSubmitted && !isSelected && !isCorrectAnswer && 'border-border opacity-60',
                isSubmitted && 'cursor-default',
                !isSubmitted && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-500 focus-visible:ring-offset-2',
              )}
              aria-disabled={isSubmitted}
            >
              <span className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold text-sm shrink-0 transition-colors',
                !isSubmitted && !isSelected && 'border-border text-muted-foreground',
                !isSubmitted && isSelected && 'border-burgundy-500 bg-burgundy-600 text-white',
                isSubmitted && isCorrectShown && 'border-green-500 bg-green-600 text-white',
                isSubmitted && isWrongSelected && 'border-red-500 bg-red-600 text-white',
                isSubmitted && !isSelected && !isCorrectAnswer && 'border-border text-muted-foreground',
              )}>
                {option.label}
              </span>
              <span className="flex-1 text-sm">{option.text}</span>
              {isSubmitted && isCorrectShown && (
                <span className="text-green-600 text-xs font-medium">Correct</span>
              )}
              {isSubmitted && isWrongSelected && (
                <span className="text-red-600 text-xs font-medium">Incorrect</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Confidence & Controls */}
      {!isSubmitted && (
        <div className="space-y-4">
          {showConfidence && selectedOption && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">How confident are you?</p>
              <div className="flex gap-2">
                {(['unsure', 'medium', 'confident'] as ConfidenceLevel[]).map((level) => (
                  <Button
                    key={level}
                    variant={confidence === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfidence(level)}
                    className="capitalize"
                  >
                    {level === 'unsure' && '🤔 '}
                    {level === 'medium' && '👍 '}
                    {level === 'confident' && '💪 '}
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {question.hint && !hintRevealed && (
            <Button variant="ghost" size="sm" onClick={handleShowHint}>
              💡 Show Hint
            </Button>
          )}
        </div>
      )}

      {/* Hint Card */}
      {hintRevealed && hint && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-1">Hint</p>
          <p className="text-sm text-blue-700">{hint}</p>
        </div>
      )}
    </div>
  )
}
