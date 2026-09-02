'use client'

import Link from 'next/link'
import { Plus, Upload, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  questionCount: number
  onAddQuestion: () => void
}

export function QuickActions({ questionCount, onAddQuestion }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Button 
        size="lg" 
        className="gap-2"
        onClick={onAddQuestion}
      >
        <Plus className="h-5 w-5" />
        {questionCount === 0 ? 'Add your first MCQ' : 'Add MCQ'}
      </Button>
      <Link href="/ai-studio">
        <Button variant="outline" size="lg" className="gap-2">
          <Upload className="h-5 w-5" />
          Import MCQs
        </Button>
      </Link>
      <Link href="/subjects/new">
        <Button variant="secondary" size="lg" className="gap-2">
          <FolderPlus className="h-5 w-5" />
          Create Subject
        </Button>
      </Link>
    </div>
  )
}