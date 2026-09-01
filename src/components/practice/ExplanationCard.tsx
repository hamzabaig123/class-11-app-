'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExplanationCardProps {
  isCorrect: boolean
  correctLabel: string
  selectedLabel: string
  explanation: string | null
}

export function ExplanationCard({ isCorrect, correctLabel, selectedLabel, explanation }: ExplanationCardProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className={cn(
      'rounded-lg border-2 overflow-hidden',
      isCorrect
        ? 'border-green-200 bg-green-50/50'
        : 'border-red-200 bg-red-50/50',
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-3 text-left font-medium transition-colors',
          isCorrect
            ? 'text-green-800 hover:bg-green-100/50'
            : 'text-red-800 hover:bg-red-100/50',
        )}
      >
        {isCorrect ? (
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
        )}
        <span className="flex-1">
          {isCorrect ? 'Correct!' : `Incorrect — The answer is ${correctLabel}`}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 opacity-60" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {explanation ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{explanation}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Explanation not available yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
