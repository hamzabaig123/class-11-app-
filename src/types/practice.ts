export type PracticeMode = string
export type PracticeStatus = string
export type QuestionStatus = string
export type ConfidenceLevel = string

export interface SafeQuestion {
  id: string
  text: string
  hint: string | null
  difficulty: string
  subject: { id: string; name: string; color: string | null } | null
  topic: { id: string; name: string } | null
  options: { label: string; text: string }[]
  position: number
  status: QuestionStatus
  selectedOptionKey: string | null
  isCorrect: boolean | null
  hintUsed: boolean
  confidence: ConfidenceLevel | null
  timeSpentMs: number
}

export interface PracticeSession {
  id: string
  title: string | null
  mode: PracticeMode
  status: PracticeStatus
  questionCount: number
  currentIndex: number
  correctCount: number
  answeredCount: number
  totalTimeMs: number
  timeLimitSeconds: number | null
  startedAt: string
  lastActiveAt: string
  completedAt: string | null
  score: number | null
  questions: SafeQuestion[]
}

export interface PracticeResults {
  sessionId: string
  title: string | null
  mode: PracticeMode
  status: PracticeStatus
  score: number
  accuracy: number | null
  totalQuestions: number
  answeredCount: number
  correctCount: number
  incorrectCount: number
  skippedCount: number
  unansweredCount: number
  durationMs: number
  startedAt: string
  completedAt: string | null
  weakTopics: WeakTopic[]
  questions: ResultQuestion[]
}

export interface WeakTopic {
  name: string
  accuracy: number
  correct: number
  total: number
}

export interface ResultQuestion {
  id: string
  text: string
  difficulty: string
  subject: { id: string; name: string } | null
  topic: { id: string; name: string } | null
  position: number
  status: QuestionStatus
  selectedOptionKey: string | null
  isCorrect: boolean | null
  confidence: ConfidenceLevel | null
  timeSpentMs: number
}

export interface PracticeConfig {
  mode: PracticeMode
  subjectId?: string
  topicId?: string
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  count: number
  timeLimitSeconds?: number
  randomize: boolean
  collectionId?: string
  title?: string
}