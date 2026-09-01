'use client'

import Link from 'next/link'
import { BookOpen, Plus, Upload, FolderPlus, Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EmptyWorkspaceCardProps {
  questionCount: number
  onOpenLibrary: () => void
  onCreateSubject: () => void
  onAddQuestion: () => void
  onImportQuestions: () => void
}

export function EmptyWorkspaceCard({
  questionCount,
  onOpenLibrary,
  onCreateSubject,
  onAddQuestion,
  onImportQuestions,
}: EmptyWorkspaceCardProps) {
  if (questionCount > 0) return null

  return (
    <Card className="mb-6 border-burgundy-200 bg-burgundy-50">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-burgundy-600" />
              <h3 className="text-xl font-semibold text-burgundy-900">Start with your content</h3>
            </div>
            <p className="text-burgundy-700">Your workspace is ready. Build your question library and track your progress.</p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Private by default
              </Badge>
              <Badge variant="outline" className="gap-1">
                <BookOpen className="h-3 w-3" />
                Your library is empty
              </Badge>
            </div>

            <p className="text-sm text-burgundy-600">
              Create a subject, add your first MCQ, or import a question set.
              Your progress will be calculated from real activity only.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={onOpenLibrary} className="gap-2 flex-1">
              <BookOpen className="h-4 w-4" />
              Open Question Library
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onAddQuestion} className="gap-2 flex-1">
              <Plus className="h-4 w-4" />
              Add MCQ
            </Button>
            <Button variant="secondary" onClick={onImportQuestions} className="gap-2 flex-1">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="ghost" onClick={onCreateSubject} className="gap-2 flex-1">
              <FolderPlus className="h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}