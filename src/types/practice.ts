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
  selectedLabel: string | null
  isCorrect: boolean | null
  hintUsed: boolean
  confidence: ConfidenceLevel | null
  timeSpentMs: number
  answerSequence: number
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
  timeLimitSeconds: number | null
  elapsedSeconds: number
  lastClientSequence: number
  startedAt: string | null
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
  startedAt: string | null
  completedAt: string | null
  weakTopics: Array<{
    name: string
    accuracy: number
    correct: number
    total: number
  }>
  questions: Array<{
    id: string
    text: string
    difficulty: string
    subject: { id: string; name: string } | null
    topic: { id: string; name: string } | null
    position: number
    status: QuestionStatus
    selectedLabel: string | null
    isCorrect: boolean | null
    confidence: ConfidenceLevel | null
    timeSpentMs: number
  }>
}
