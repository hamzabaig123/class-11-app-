import type { Question, QuestionOption, QuestionAnswer, QuestionTag, Subject, Topic, QuestionBookmark, Attempt, ReviewItem } from '@prisma/client'

export type QuestionWithRelations = Question & {
  options: QuestionOption[]
  answer: QuestionAnswer | null
  tags: QuestionTag[]
  subject: (Subject & { color: string | null }) | null
  topic: Topic | null
  reviewItem: ReviewItem | null
  bookmarks: QuestionBookmark[]
  _count: { attempts: number }
}

export type QuestionListItem = Question & {
  options: QuestionOption[]
  tags: QuestionTag[]
  subject: { id: string; name: string; color: string | null } | null
  topic: { id: string; name: string } | null
  _count: { attempts: number }
  bookmarks: QuestionBookmark[]
  attemptsCount: number
  bookmarked: boolean
}

export type QuestionDetail = QuestionWithRelations & {
  bookmarked: boolean
  attemptsCount: number
}

export type QuestionFormData = {
  text: string
  options: { label: 'A' | 'B' | 'C' | 'D'; text: string }[]
  correctLabel: 'A' | 'B' | 'C' | 'D'
  explanation?: string
  hint?: string
  source?: string
  year?: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  subjectId?: string
  topicId?: string
  tags: string[]
}

export type QuestionFilters = {
  subjectId?: string
  topicId?: string
  status?: 'ACTIVE' | 'ARCHIVED' | 'FLAGGED'
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  bookmarked?: boolean
  year?: number
  search?: string
  sort?: 'createdAt_desc' | 'createdAt_asc' | 'updatedAt_desc' | 'updatedAt_asc' | 'difficulty_asc' | 'difficulty_desc'
}

export type QuestionCount = {
  total: number
  active: number
  archived: number
  flagged: number
}

export type BulkUpdateAction = 'archive' | 'restore' | 'delete' | 'changeSubject' | 'changeDifficulty' | 'bookmark' | 'unbookmark'

export type BulkUpdateInput = {
  questionIds: string[]
  action: BulkUpdateAction
  subjectId?: string | null
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
}

export type BulkUpdateResult = {
  questionId: string
  success: boolean
  error?: string
}

export type BulkUpdateResponse = {
  results: BulkUpdateResult[]
}