'use client'

import Link from 'next/link'
import { BookOpen, Plus, FolderPlus, TrendingUp, Target, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPercentage } from '@/lib/utils'

interface SubjectSummary {
  id: string
  name: string
  questionCount: number
  accuracy: number | null
  masteredCount: number
}

interface SyllabusCardProps {
  subjects: SubjectSummary[]
  onAddSubject: () => void
  loading?: boolean
}

export function SyllabusCard({ subjects, onAddSubject, loading }: SyllabusCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your syllabus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your syllabus
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="space-y-4">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Subjects will appear here</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Organize MCQs into subjects and chapters so every review session reflects your actual study plan.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={onAddSubject} className="gap-2">
                <FolderPlus className="h-4 w-4" />
                Add Subject
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <Link href="/questions/new">
                  <Plus className="h-4 w-4" />
                  Add MCQ
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Your syllabus
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onAddSubject} className="gap-1">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-3">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-burgundy-100 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-burgundy-600" />
                </div>
                <div>
                  <p className="font-medium">{subject.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {subject.questionCount} questions
                    {subject.masteredCount > 0 && (
                      <> • {subject.masteredCount} mastered</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground">
                {subject.accuracy !== null && (
                  <span className="flex items-center gap-1" title="Accuracy">
                    <Target className="h-3.5 w-3.5" />
                    {formatPercentage(subject.accuracy)}
                  </span>
                )}
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t text-center">
          <Link href="/subjects" className="text-sm text-burgundy-600 hover:underline">
            Manage syllabus →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}