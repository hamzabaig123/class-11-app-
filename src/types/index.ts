// Shared types for the application

export interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  initials: string
}

export interface DashboardSummary {
  user: {
    displayName: string
    initials: string
  }
  questionCount: number
  masteredCount: number
  accuracy: number | null
  attemptedCount: number
  dueTodayCount: number
  studyStreakDays: number
  studyTimeSeconds: number
  unfinishedSession: UnfinishedSession | null
  subjects: SubjectSummary[]
  recentActivity: ActivityEvent[]
  onboardingComplete: boolean
  lastUpdatedAt: string
}

export interface UnfinishedSession {
  id: string
  currentIndex: number
  totalQuestions: number
  title: string
}

export interface SubjectSummary {
  id: string
  name: string
  questionCount: number
  accuracy: number | null
  masteredCount: number
}

export interface ActivityEvent {
  id: string
  type: string
  title: string
  occurredAt: string
  entityId: string | null
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type QuestionStatus = 'ACTIVE' | 'ARCHIVED' | 'FLAGGED'
export type ReviewStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED' | 'LAPSED'
export type SessionType = 'PRACTICE' | 'REVISION' | 'QUIZ' | 'EXAM'
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
export type ImportStatus = 'PENDING' | 'PROCESSING' | 'REVIEW_REQUIRED' | 'COMPLETED' | 'FAILED'
export type ImportedQuestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW'
export type ActivityType =
  | 'QUESTION_CREATED'
  | 'QUESTION_ANSWERED'
  | 'SESSION_STARTED'
  | 'SESSION_COMPLETED'
  | 'SESSION_ABANDONED'
  | 'REVIEW_COMPLETED'
  | 'SUBJECT_CREATED'
  | 'TOPIC_CREATED'
  | 'IMPORT_STARTED'
  | 'IMPORT_COMPLETED'
  | 'IMPORT_APPROVED'
  | 'STREAK_MILESTONE'
  | 'MASTERY_ACHIEVED'
  | 'NOTE_CREATED'

// Re-export question types
export * from './questions'