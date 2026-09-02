import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'

export const practiceRouter = createTRPCRouter({
  createSession: protectedProcedure
    .input(z.object({
      mode: z.enum(['QUICK', 'SUBJECT', 'WEAK', 'REVIEW', 'COLLECTION', 'MOCK', 'UNANSWERED']).default('QUICK'),
      subjectId: z.string().optional(),
      topicId: z.string().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      count: z.number().int().min(1).max(100).default(10),
      timeLimitSeconds: z.number().int().positive().optional(),
      randomize: z.boolean().default(true),
      collectionId: z.string().optional(),
      reviewItemIds: z.array(z.string()).optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      let questionIds: string[] = []
      let title = input.title || ''

      switch (input.mode) {
        case 'REVIEW': {
          const now = new Date()
          const reviewItems = input.reviewItemIds
            ? await prisma.reviewItem.findMany({
                where: { id: { in: input.reviewItemIds }, userId },
                select: { questionId: true },
              })
            : await prisma.reviewItem.findMany({
                where: {
                  userId,
                  status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] },
                  nextReviewAt: { lte: now },
                },
                select: { questionId: true },
                orderBy: { nextReviewAt: 'asc' },
                take: input.count,
              })
          questionIds = reviewItems.map(r => r.questionId)
          if (!title) title = 'Due Review'
          break
        }

        case 'SUBJECT': {
          const where: any = { userId, status: 'ACTIVE' }
          if (input.subjectId) where.subjectId = input.subjectId
          if (input.topicId) where.topicId = input.topicId
          if (input.difficulty) where.difficulty = input.difficulty

          const questions = await prisma.question.findMany({
            where,
            select: { id: true },
            take: input.count,
            orderBy: { createdAt: 'desc' },
          })
          questionIds = questions.map(q => q.id)

          if (input.subjectId) {
            const subject = await prisma.subject.findUnique({ where: { id: input.subjectId }, select: { name: true } })
            title = title || `${subject?.name ?? 'Subject'} Practice`
          } else {
            title = title || 'Subject Practice'
          }
          break
        }

        case 'WEAK': {
          const weakQuestions = await prisma.reviewItem.findMany({
            where: {
              userId,
              status: { in: ['LAPSED', 'LEARNING'] },
            },
            select: { questionId: true },
            orderBy: { nextReviewAt: 'asc' },
            take: input.count,
          })
          questionIds = weakQuestions.map(r => r.questionId)

          if (questionIds.length < input.count) {
            const additionalCount = input.count - questionIds.length
            const additional = await prisma.question.findMany({
              where: {
                userId,
                status: 'ACTIVE',
                id: { notIn: questionIds },
              },
              select: { id: true },
              take: additionalCount,
            })
            questionIds.push(...additional.map(q => q.id))
          }
          if (!title) title = 'Weak Areas'
          break
        }

        case 'COLLECTION': {
          if (!input.collectionId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Collection ID required' })
          const collection = await prisma.collectionQuestion.findMany({
            where: {
              collectionId: input.collectionId,
              question: { userId, status: 'ACTIVE' },
            },
            select: { questionId: true },
            orderBy: { sortOrder: 'asc' },
          })
          questionIds = collection.map(c => c.questionId)
          if (input.randomize) questionIds.sort(() => Math.random() - 0.5)
          questionIds = questionIds.slice(0, input.count)

          const col = await prisma.collection.findUnique({ where: { id: input.collectionId }, select: { name: true } })
          title = title || `Collection: ${col?.name ?? 'Unknown'}`
          break
        }

        case 'MOCK': {
          const where: any = { userId, status: 'ACTIVE' }
          if (input.difficulty) where.difficulty = input.difficulty

          const questions = await prisma.question.findMany({
            where,
            select: { id: true },
            orderBy: { createdAt: 'desc' },
          })
          questionIds = questions.map(q => q.id)
          if (input.randomize) questionIds.sort(() => Math.random() - 0.5)
          questionIds = questionIds.slice(0, input.count)
          if (!title) title = 'Mock Test'
          break
        }

        case 'UNANSWERED': {
          const unanswered = await prisma.question.findMany({
            where: {
              userId,
              status: 'ACTIVE',
              attempts: { none: {} },
            },
            select: { id: true },
            take: input.count,
          })
          questionIds = unanswered.map(q => q.id)
          if (input.randomize) questionIds.sort(() => Math.random() - 0.5)
          if (!title) title = 'Unanswered Practice'
          break
        }

        case 'QUICK':
        default: {
          const where: any = { userId, status: 'ACTIVE' }
          if (input.subjectId) where.subjectId = input.subjectId
          if (input.topicId) where.topicId = input.topicId
          if (input.difficulty) where.difficulty = input.difficulty

          const questions = await prisma.question.findMany({
            where,
            select: { id: true },
            take: input.count,
          })
          questionIds = questions.map(q => q.id)
          if (input.randomize) questionIds.sort(() => Math.random() - 0.5)
          if (!title) title = 'Quick Practice'
          break
        }
      }

      if (questionIds.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No questions available for this session configuration' })
      }

      const session = await prisma.practiceSession.create({
        data: {
          userId,
          title,
          mode: input.mode,
          type: input.mode === 'MOCK' ? 'EXAM' : 'PRACTICE',
          questionCount: questionIds.length,
          timeLimitSeconds: input.timeLimitSeconds,
          selectionSnapshot: JSON.stringify(input),
        },
      })

      await prisma.practiceSessionQuestion.createMany({
        data: questionIds.map((questionId, index) => ({
          sessionId: session.id,
          questionId,
          position: index,
        })),
      })

      await prisma.activityEvent.create({
        data: {
          userId,
          type: 'SESSION_STARTED',
          title: `Started ${title}`,
          entityId: session.id,
          entityType: 'session',
        },
      })

      return {
        sessionId: session.id,
        title: session.title,
        mode: session.mode,
        questionCount: questionIds.length,
        timeLimitSeconds: session.timeLimitSeconds,
      }
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
        include: {
          practiceQuestions: {
            orderBy: { position: 'asc' },
            include: {
              question: {
                include: {
                  options: { orderBy: { position: 'asc' } },
                  subject: { select: { id: true, name: true, color: true } },
                  topic: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      })

      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })

      const safeQuestions = session.practiceQuestions.map(pq => ({
        id: pq.question.id,
        text: pq.question.text,
        explanation: pq.question.explanation,
        hint: pq.question.hint,
        difficulty: pq.question.difficulty,
        subject: pq.question.subject,
        topic: pq.question.topic,
        options: pq.question.options.map(o => ({ label: o.label, text: o.text })),
        position: pq.position,
        status: pq.status,
        selectedLabel: pq.selectedLabel,
        isCorrect: pq.isCorrect,
        hintUsed: pq.hintUsed,
        confidence: pq.confidence,
        timeSpentMs: pq.timeSpentMs,
        answerSequence: pq.answerSequence,
      }))

      return {
        id: session.id,
        title: session.title,
        mode: session.mode,
        status: session.status,
        questionCount: session.questionCount,
        currentIndex: session.currentIndex,
        correctCount: session.correctCount,
        answeredCount: session.answeredCount,
        timeLimitSeconds: session.timeLimitSeconds,
        startedAt: session.startedAt?.toISOString() ?? null,
        lastActiveAt: session.lastActiveAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
        score: session.score,
        questions: safeQuestions,
      }
    }),

  startSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
      })
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      if (session.status !== 'READY') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session already started' })

      return prisma.practiceSession.update({
        where: { id: input.sessionId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      })
    }),

  answer: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      sessionQuestionId: z.string(),
      clientEventId: z.string(),
      sequence: z.number().int().min(0),
      selectedLabel: z.enum(['A', 'B', 'C', 'D']),
      timeSpentMs: z.number().int().positive(),
      confidence: z.enum(['unsure', 'medium', 'confident']).optional(),
      hintUsed: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.$transaction(async (tx) => {
        const session = await tx.practiceSession.findFirst({
          where: { id: input.sessionId, userId: ctx.user.id },
        })
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
        if (session.status !== 'IN_PROGRESS') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session is not in progress' })
        }

        // Check for duplicate event (idempotency)
        const existingEvent = await tx.practiceAnswerEvent.findUnique({
          where: {
            sessionId_clientEventId: {
              sessionId: input.sessionId,
              clientEventId: input.clientEventId,
            },
          },
        })
        if (existingEvent) {
          // Return original result
          return {
            attemptId: existingEvent.id,
            isCorrect: existingEvent.isCorrect,
            correctLabel: existingEvent.selectedLabel,
            alreadyAnswered: true,
          }
        }

        const pq = await tx.practiceSessionQuestion.findFirst({
          where: {
            id: input.sessionQuestionId,
            sessionId: input.sessionId,
          },
          include: { question: { include: { answer: true } } },
        })
        if (!pq) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found in session' })

        if (pq.status !== 'UNANSWERED' && pq.status !== 'SKIPPED') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Question already answered' })
        }

        const correctLabel = pq.question.answer?.correctLabel
        if (!correctLabel) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Question has no answer key' })

        const isCorrect = input.selectedLabel === correctLabel

        // Create idempotent answer event
        const answerEvent = await tx.practiceAnswerEvent.create({
          data: {
            sessionId: input.sessionId,
            sessionQuestionId: pq.id,
            userId: ctx.user.id,
            clientEventId: input.clientEventId,
            sequence: input.sequence,
            selectedLabel: input.selectedLabel,
            isCorrect,
            timeSpentMs: input.timeSpentMs,
            hintUsed: input.hintUsed,
            confidence: input.confidence,
          },
        })

        // Update session question state
        await tx.practiceSessionQuestion.update({
          where: { id: pq.id },
          data: {
            selectedLabel: input.selectedLabel,
            isCorrect,
            status: 'ANSWERED',
            hintUsed: input.hintUsed,
            confidence: input.confidence,
            timeSpentMs: input.timeSpentMs,
            answerSequence: input.sequence,
            answeredAt: new Date(),
          },
        })

        // Create learning attempt
        const attempt = await tx.attempt.create({
          data: {
            questionId: pq.questionId,
            userId: ctx.user.id,
            selectedLabel: input.selectedLabel,
            isCorrect,
            confidence: input.confidence,
            hintUsed: input.hintUsed,
            timeSpentMs: input.timeSpentMs,
            sessionId: input.sessionId,
            attemptedAt: new Date(),
          },
        })

        // Update review item
        const reviewItem = await tx.reviewItem.findFirst({
          where: { userId: ctx.user.id, questionId: pq.questionId },
        })
        await updateReviewItem(tx, ctx.user.id, pq.questionId, isCorrect, reviewItem)

        // Update session counts
        await tx.practiceSession.update({
          where: { id: input.sessionId },
          data: {
            answeredCount: { increment: 1 },
            correctCount: { increment: isCorrect ? 1 : 0 },
            lastClientSequence: input.sequence,
            lastActiveAt: new Date(),
          },
        })

        return {
          attemptId: attempt.id,
          isCorrect,
          correctLabel,
          explanation: pq.question.answer?.explanation || null,
        }
      })
    }),

  skip: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      questionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const pq = await prisma.practiceSessionQuestion.findFirst({
        where: {
          sessionId: input.sessionId,
          questionId: input.questionId,
          session: { userId: ctx.user.id },
        },
      })
      if (!pq) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found in session' })

      await prisma.practiceSessionQuestion.update({
        where: { id: pq.id },
        data: { status: 'SKIPPED' },
      })

      const nextPosition = await prisma.practiceSessionQuestion.findFirst({
        where: {
          sessionId: input.sessionId,
          status: 'UNANSWERED',
          position: { gt: pq.position },
        },
        orderBy: { position: 'asc' },
        select: { position: true },
      })

      const nextIdx = nextPosition?.position ?? pq.position + 1

      await prisma.practiceSession.update({
        where: { id: input.sessionId },
        data: { currentIndex: nextIdx, lastActiveAt: new Date() },
      })

      return { nextPosition: nextIdx }
    }),

  complete: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
        include: {
          practiceQuestions: {
            select: { isCorrect: true, status: true, confidence: true },
          },
        },
      })
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })

      const totalAnswered = session.practiceQuestions.filter(
        pq => pq.status === 'ANSWERED'
      ).length
      const totalCorrect = session.practiceQuestions.filter(
        pq => pq.isCorrect === true
      ).length
      const score = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0

      await prisma.practiceSession.update({
        where: { id: input.sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          score,
        },
      })

      await prisma.activityEvent.create({
        data: {
          userId: ctx.user.id,
          type: 'SESSION_COMPLETED',
          title: `Completed "${session.title ?? 'Practice'}" - ${Math.round(score)}%`,
          entityId: session.id,
          entityType: 'session',
          metadata: JSON.stringify({ score, totalAnswered, totalCorrect }),
        },
      })

      return { sessionId: session.id, score, totalAnswered, totalCorrect }
    }),

  pause: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
      })
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      if (session.status !== 'IN_PROGRESS') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session is not in progress' })
      }
      return prisma.practiceSession.update({
        where: { id: input.sessionId },
        data: { status: 'PAUSED', pausedAt: new Date() },
      })
    }),

  resume: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
      })
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      if (session.status !== 'PAUSED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session is not paused' })
      }
      return prisma.practiceSession.update({
        where: { id: input.sessionId },
        data: { status: 'IN_PROGRESS', pausedAt: null },
      })
    }),

  abandon: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.update({
        where: { id: input.sessionId, userId: ctx.user.id },
        data: { status: 'ABANDONED', abandonedAt: new Date() },
      })

      await prisma.activityEvent.create({
        data: {
          userId: ctx.user.id,
          type: 'SESSION_ABANDONED',
          title: `Abandoned "${session.title ?? 'Practice'}"`,
          entityId: session.id,
          entityType: 'session',
        },
      })

      return { success: true }
    }),

  results: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
        include: {
          practiceQuestions: {
            orderBy: { position: 'asc' },
            include: {
              question: {
                select: {
                  id: true,
                  text: true,
                  difficulty: true,
                  subject: { select: { id: true, name: true } },
                  topic: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      })
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })

      const answered = session.practiceQuestions.filter(pq => pq.status === 'ANSWERED')
      const correct = answered.filter(pq => pq.isCorrect === true)
      const incorrect = answered.filter(pq => pq.isCorrect === false)
      const skipped = session.practiceQuestions.filter(pq => pq.status === 'SKIPPED')
      const unanswered = session.practiceQuestions.filter(pq => pq.status === 'UNANSWERED')

      const accuracy = answered.length > 0 ? (correct.length / answered.length) * 100 : null

      const topicStats = new Map<string, { name: string; correct: number; total: number }>()
      for (const pq of session.practiceQuestions) {
        if (pq.status !== 'ANSWERED') continue
        const topicName = pq.question.topic?.name || 'Unknown Topic'
        const topicId = pq.question.topic?.id || 'unknown'
        const existing = topicStats.get(topicId) || { name: topicName, correct: 0, total: 0 }
        existing.total++
        if (pq.isCorrect) existing.correct++
        topicStats.set(topicId, existing)
      }

      const weakTopics = Array.from(topicStats.values())
        .filter(t => t.total > 0)
        .map(t => ({
          name: t.name,
          accuracy: (t.correct / t.total) * 100,
          correct: t.correct,
          total: t.total,
        }))
        .filter(t => t.accuracy < 75)
        .sort((a, b) => a.accuracy - b.accuracy)

      const durationMs = session.completedAt && session.startedAt
        ? session.completedAt.getTime() - session.startedAt.getTime()
        : session.elapsedSeconds * 1000

      return {
        sessionId: session.id,
        title: session.title,
        mode: session.mode,
        status: session.status,
        score: session.score ?? accuracy ?? 0,
        accuracy,
        totalQuestions: session.questionCount,
        answeredCount: answered.length,
        correctCount: correct.length,
        incorrectCount: incorrect.length,
        skippedCount: skipped.length,
        unansweredCount: unanswered.length,
        durationMs,
        startedAt: session.startedAt?.toISOString() ?? null,
        completedAt: session.completedAt?.toISOString() ?? null,
        weakTopics,
        questions: session.practiceQuestions.map(pq => ({
          id: pq.question.id,
          text: pq.question.text,
          difficulty: pq.question.difficulty,
          subject: pq.question.subject,
          topic: pq.question.topic,
          position: pq.position,
          status: pq.status,
          selectedLabel: pq.selectedLabel,
          isCorrect: pq.isCorrect,
          confidence: pq.confidence,
          timeSpentMs: pq.timeSpentMs,
        })),
      }
    }),

  reportQuestion: protectedProcedure
    .input(z.object({
      questionId: z.string(),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.activityEvent.create({
        data: {
          userId: ctx.user.id,
          type: 'QUESTION_FLAGGED',
          title: `Reported question: ${input.reason}`,
          entityId: input.questionId,
          entityType: 'question',
          metadata: JSON.stringify({ reason: input.reason }),
        },
      })

      return { success: true }
    }),

  getWeakTopics: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const { limit } = input

      const topics = await prisma.topic.findMany({
        where: { userId: ctx.user.id },
        include: {
          questions: {
            include: {
              attempts: { where: { userId: ctx.user.id } },
            },
          },
          subject: { select: { name: true } },
        },
      })

      const topicStats = topics.map(topic => {
        const attempts = topic.questions.flatMap(q => q.attempts)
        const correctCount = attempts.filter(a => a.isCorrect).length
        const incorrectCount = attempts.filter(a => !a.isCorrect).length
        const total = correctCount + incorrectCount
        const weaknessScore = total > 0 ? (incorrectCount / total) * 100 : 0

        return {
          id: topic.id,
          name: topic.name,
          subject: topic.subject?.name,
          correctCount,
          incorrectCount,
          weaknessScore,
          lastAttemptedAt: attempts.length > 0 ? attempts[attempts.length - 1].createdAt : null,
        }
      })

      return topicStats
        .filter(t => t.correctCount + t.incorrectCount > 0)
        .sort((a, b) => b.weaknessScore - a.weaknessScore)
        .slice(0, limit)
    }),
})

async function updateReviewItem(
  tx: any,
  userId: string,
  questionId: string,
  isCorrect: boolean,
  existingItem: any
) {
  if (!existingItem) {
    await tx.reviewItem.create({
      data: { questionId, userId, status: 'NEW', nextReviewAt: new Date() },
    })
    return
  }

  const settings = await tx.userSettings.findUnique({ where: { userId } })
  const masteryThreshold = settings?.masteryThreshold ?? 3
  const easeFactorDefault = settings?.easeFactorDefault ?? 2.5

  let { status, intervalDays, easeFactor, repetitions } = existingItem
  const now = new Date()

  if (isCorrect) {
    repetitions++
    if (status === 'NEW' || status === 'LAPSED') {
      intervalDays = 1
      status = 'LEARNING'
    } else if (status === 'LEARNING') {
      intervalDays = 3
      status = repetitions >= masteryThreshold ? 'MASTERED' : 'REVIEW'
    } else if (status === 'REVIEW') {
      intervalDays = Math.round(intervalDays * easeFactor)
      status = repetitions >= masteryThreshold ? 'MASTERED' : 'REVIEW'
    } else if (status === 'MASTERED') {
      intervalDays = Math.round(intervalDays * easeFactor)
    }
    easeFactor = Math.max(1.3, easeFactor + 0.1)
  } else {
    intervalDays = 0
    repetitions = 0
    status = 'LAPSED'
    easeFactor = Math.max(1.3, easeFactor - 0.2)
  }

  const nextReviewAt = new Date(now)
  nextReviewAt.setDate(now.getDate() + intervalDays)

  await tx.reviewItem.update({
    where: { id: existingItem.id },
    data: { status, intervalDays, easeFactor, repetitions, nextReviewAt, lastReviewedAt: now },
  })

  if (status === 'MASTERED' && existingItem.status !== 'MASTERED') {
    await tx.activityEvent.create({
      data: {
        userId,
        type: 'MASTERY_ACHIEVED',
        title: 'Achieved mastery',
        entityId: questionId,
        entityType: 'question',
      },
    })
  }
}
