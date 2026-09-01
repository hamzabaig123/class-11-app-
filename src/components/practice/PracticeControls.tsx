'use client'

import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Send,
  CheckSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PracticeControlsProps {
  hasPrevious: boolean
  hasNext: boolean
  isSubmitted: boolean
  isSubmitting: boolean
  selectedOption: string | null
  isLastQuestion: boolean
  unansweredCount: number
  onPrevious: () => void
  onNext: () => void
  onSkip: () => void
  onSubmit: () => void
  onFinish: () => void
}

export function PracticeControls({
  hasPrevious,
  hasNext,
  isSubmitted,
  isSubmitting,
  selectedOption,
  isLastQuestion,
  unansweredCount,
  onPrevious,
  onNext,
  onSkip,
  onSubmit,
  onFinish,
}: PracticeControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-4 border-t">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="gap-1.5"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <div className="flex items-center gap-2">
        {!isSubmitted && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="gap-1.5 text-muted-foreground"
          >
            <span className="hidden sm:inline">Skip</span>
            <SkipForward className="h-4 w-4 sm:hidden" />
          </Button>
        )}

        {isSubmitted ? (
          isLastQuestion ? (
            <Button
              onClick={onFinish}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Finish Session</span>
              <span className="sm:hidden">Finish</span>
            </Button>
          ) : (
            <Button
              onClick={onNext}
              className="gap-1.5"
            >
              <span className="hidden sm:inline">Next Question</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )
        ) : (
          <Button
            onClick={onSubmit}
            disabled={!selectedOption || isSubmitting}
            loading={isSubmitting}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Submit Answer</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        )}
      </div>
    </div>
  )
}
