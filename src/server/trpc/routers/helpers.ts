import { prisma } from '@/lib/db'

export async function logActivity(
  userId: string,
  type: string,
  title: string,
  entityId?: string,
  entityType?: string,
  metadata?: any
) {
  await prisma.activityEvent.create({
    data: { userId, type, title, entityId, entityType, metadata: metadata ? JSON.stringify(metadata) : undefined },
  })
}

export async function getUserTimezone(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } })
  return settings?.timezone ?? 'UTC'
}

export async function assertUserOwnsSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } })
  if (!subject) throw new Error('Subject not found or access denied')
  return subject
}

export async function assertUserOwnsChapter(userId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, userId } })
  if (!chapter) throw new Error('Chapter not found or access denied')
  return chapter
}

export async function assertUserOwnsSource(userId: string, sourceId: string) {
  const source = await prisma.source.findFirst({ where: { id: sourceId, userId } })
  if (!source) throw new Error('Source not found or access denied')
  return source
}

export async function assertUserOwnsQuestion(userId: string, questionId: string) {
  const question = await prisma.question.findFirst({ where: { id: questionId, userId } })
  if (!question) throw new Error('Question not found or access denied')
  return question
}

// Calculate study streak
export async function calculateStreak(userId: string): Promise<number> {
  const events = await prisma.activityEvent.findMany({
    where: {
      userId,
      type: { in: ['QUESTION_ANSWERED', 'SESSION_COMPLETED', 'REVIEW_COMPLETED'] },
    },
    orderBy: { createdAt: 'desc' },
    distinct: ['createdAt'],
    take: 365,
  })

  if (events.length === 0) return 0

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  for (const event of events) {
    const eventDate = new Date(event.createdAt)
    eventDate.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((currentDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === streak) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else if (diffDays > streak) {
      break
    }
  }
  return streak
}

// Get subjects with stats (chapter counts, question counts, accuracy)
export async function getSubjectsWithStats(userId: string) {
  const subjects = await prisma.subject.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { position: 'asc' },
    include: {
      _count: { select: { questions: true, chapters: true } },
      chapters: {
        where: { status: 'ACTIVE' },
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { questions: { where: { status: 'ACTIVE' } } } },
        },
      },
      questions: {
        where: { status: 'ACTIVE' },
        include: {
          reviewItems: { take: 1 },
          attempts: { select: { isCorrect: true } },
        },
      },
    },
  })

  return subjects.map(s => {
    const questions = s.questions
    const totalAttempts = questions.reduce((sum, q) => sum + q.attempts.length, 0)
    const correctAttempts = questions.reduce((sum, q) => sum + q.attempts.filter(a => a.isCorrect).length, 0)
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : null
    const masteredCount = questions.filter(q => q.reviewItems[0]?.status === 'MASTERED').length

    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      icon: s.icon,
      color: s.color,
      questionCount: s._count.questions,
      chapterCount: s._count.chapters,
      accuracy,
      masteredCount,
      chapters: s.chapters.map(c => ({
        id: c.id,
        name: c.name,
        chapterNo: c.chapterNo,
        position: c.position,
        questionCount: c._count.questions,
      })),
    }
  })
}
