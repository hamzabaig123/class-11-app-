import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import { practiceRouter } from './practice'
import { importsRouter } from './imports'

export const appRouter = createTRPCRouter({
  // Health check
  health: publicProcedure.query(() => ({ status: 'ok' })),

  // Dashboard
  dashboard: createTRPCRouter({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id
      const timezone = await getUserTimezone(userId)

      const now = new Date()
      const startOfDay = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(startOfDay)
      endOfDay.setHours(23, 59, 59, 999)

      // Parallel queries for performance
      const [
        questionCount,
        masteredCount,
        attemptsAgg,
        todayAttemptsCount,
        todayCorrectCount,
        todayStudySeconds,
        dueTodayCount,
        streakDays,
        studyTimeSeconds,
        unfinishedSession,
        subjects,
        recentActivity,
        userSettings,
      ] = await Promise.all([
        // Total questions
        prisma.question.count({
          where: { userId, status: 'ACTIVE' },
        }),
        // Mastered questions
        prisma.reviewItem.count({
          where: { userId, status: 'MASTERED' },
        }),
        // Overall accuracy aggregation (all-time)
        prisma.attempt.groupBy({
          by: ['isCorrect'],
          where: { userId },
          _count: true,
        }),
        // Today: number of questions attempted
        prisma.attempt.count({
          where: {
            userId,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        // Today: number of questions answered correctly
        prisma.attempt.count({
          where: {
            userId,
            isCorrect: true,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        // Today: study time from completed sessions (or started today)
        prisma.practiceSession.aggregate({
          where: {
            userId,
            status: 'COMPLETED',
            completedAt: { gte: startOfDay, lte: endOfDay },
          },
          _sum: { totalTimeMs: true },
        }).then((r) => Math.floor((r._sum.totalTimeMs ?? 0) / 1000)),
        // Due today
        prisma.reviewItem.count({
          where: {
            userId,
            nextReviewAt: { gte: startOfDay, lte: endOfDay },
            status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] },
          },
        }),
        // Weak topics for revision planner
        prisma.topicPerformance.findMany({
          where: { userId },
          include: { topic: { select: { id: true, name: true } } },
          orderBy: { weaknessScore: 'desc' },
          take: 5,
        }),
        // Study streak
        calculateStreak(userId),
        // Study time (all-time)
        prisma.practiceSession.aggregate({
          where: { userId, status: 'COMPLETED' },
          _sum: { totalTimeMs: true },
        }),
        // Unfinished session
        prisma.practiceSession.findFirst({
          where: { userId, status: 'IN_PROGRESS' },
          orderBy: { startedAt: 'desc' },
          select: { id: true, currentIndex: true, questionCount: true, title: true },
        }),
        // Subjects with stats
        getSubjectsWithStats(userId),
        // Recent activity
        prisma.activityEvent.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            entityId: true,
          },
        }),
        // User settings (daily goal, theme, etc)
        prisma.userSettings.findUnique({
          where: { userId },
          select: {
            dailyQuestionGoal: true,
            dailyMinuteGoal: true,
            timezone: true,
            masteryThreshold: true,
          },
        }),
      ])

      const onboardingComplete = !!userSettings

      const totalAttempts = attemptsAgg.reduce((sum, a) => sum + a._count, 0)
      const correctAttempts = attemptsAgg.find(a => a.isCorrect)?._count ?? 0
      const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : null

      return {
        user: {
          displayName: ctx.user.name ?? 'User',
          initials: ctx.user.name
            ? ctx.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U',
        },
        questionCount,
        masteredCount,
        accuracy,
        attemptedCount: totalAttempts,
        dueTodayCount,
        weakTopics,
        studyStreakDays: streakDays,
        studyTimeSeconds: Math.floor((studyTimeSeconds._sum.totalTimeMs ?? 0) / 1000),
        unfinishedSession: unfinishedSession ? {
          id: unfinishedSession.id,
          currentIndex: unfinishedSession.currentIndex,
          totalQuestions: unfinishedSession.questionCount,
          title: unfinishedSession.title ?? 'Practice Session',
        } : null,
        subjects,
        recentActivity: recentActivity.map(a => ({
          ...a,
          occurredAt: a.createdAt.toISOString(),
        })),
        onboardingComplete,
        lastUpdatedAt: new Date().toISOString(),
        // Today's progress and settings (used by sidebar Today's Goal card and header)
        today: {
          attemptedCount: todayAttemptsCount,
          correctCount: todayCorrectCount,
          studySeconds: todayStudySeconds,
          accuracy: todayAttemptsCount > 0 ? Math.round((todayCorrectCount / todayAttemptsCount) * 100) : null,
        },
        settings: userSettings
          ? {
            dailyQuestionGoal: userSettings.dailyQuestionGoal ?? null,
            dailyMinuteGoal: userSettings.dailyMinuteGoal ?? null,
            timezone: userSettings.timezone ?? null,
            masteryThreshold: userSettings.masteryThreshold ?? null,
          }
          : { dailyQuestionGoal: null, dailyMinuteGoal: null, timezone: null, masteryThreshold: null },
      }
    }),

    recentActivity: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        const activities = await prisma.activityEvent.findMany({
          where: { userId: ctx.user.id },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
        })
        return activities
      }),
  }),

  // Subjects
  subjects: createTRPCRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
      return prisma.subject.findMany({
        where: { userId: ctx.user.id },
        orderBy: { position: 'asc' },
        include: {
          topics: {
            orderBy: { position: 'asc' },
            select: { id: true, name: true, position: true },
          },
          _count: { select: { questions: true } },
        },
      })
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        return prisma.subject.findFirst({
          where: { id: input.id, userId: ctx.user.id },
          include: {
            topics: { orderBy: { position: 'asc' } },
            _count: { select: { questions: true } },
          },
        })
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const maxPosition = await prisma.subject.findFirst({
          where: { userId: ctx.user.id },
          orderBy: { position: 'desc' },
          select: { position: true },
        })

        const subject = await prisma.subject.create({
          data: {
            ...input,
            userId: ctx.user.id,
            position: (maxPosition?.position ?? -1) + 1,
          },
        })

        await logActivity(ctx.user.id, 'SUBJECT_CREATED', `Created subject "${subject.name}"`, subject.id, 'subject')
        return subject
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input
        const subject = await prisma.subject.update({
          where: { id, userId: ctx.user.id },
          data,
        })
        return subject
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.subject.delete({
          where: { id: input.id, userId: ctx.user.id },
        })
        return { success: true }
      }),

    reorder: protectedProcedure
      .input(z.array(z.object({ id: z.string(), position: z.number() })))
      .mutation(async ({ ctx, input }) => {
        await prisma.$transaction(
          input.map(({ id, position }) =>
            prisma.subject.update({
              where: { id, userId: ctx.user.id },
              data: { position },
            })
          )
        )
        return { success: true }
      }),
  }),

  // Topics
  topics: createTRPCRouter({
    list: protectedProcedure
      .input(z.object({ subjectId: z.string() }))
      .query(async ({ ctx, input }) => {
        return prisma.topic.findMany({
          where: { subjectId: input.subjectId, userId: ctx.user.id },
          orderBy: { position: 'asc' },
        })
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        subjectId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subject = await prisma.subject.findFirst({
          where: { id: input.subjectId, userId: ctx.user.id },
        })
        if (!subject) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' })

        const maxPosition = await prisma.topic.findFirst({
          where: { subjectId: input.subjectId },
          orderBy: { position: 'desc' },
          select: { position: true },
        })

        const topic = await prisma.topic.create({
          data: {
            ...input,
            userId: ctx.user.id,
            position: (maxPosition?.position ?? -1) + 1,
          },
        })

        await logActivity(ctx.user.id, 'TOPIC_CREATED', `Created topic "${topic.name}"`, topic.id, 'topic')
        return topic
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input
        return prisma.topic.update({
          where: { id, userId: ctx.user.id },
          data,
        })
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.topic.delete({
          where: { id: input.id, userId: ctx.user.id },
        })
        return { success: true }
      }),
  }),

  // Questions
  questions: createTRPCRouter({
    list: protectedProcedure
      .input(z.object({
        subjectId: z.string().optional(),
        topicId: z.string().optional(),
        status: z.enum(['ACTIVE', 'ARCHIVED', 'FLAGGED']).optional(),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
        year: z.number().int().min(1900).max(2100).optional(),
        search: z.string().optional(),
        sort: z.enum([
          'createdAt_desc',
          'createdAt_asc',
          'updatedAt_desc',
          'updatedAt_asc',
          'difficulty_asc',
          'difficulty_desc',
        ]).default('updatedAt_desc'),
        limit: z.number().default(50),
        cursor: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const where: any = { userId: ctx.user.id }
        if (input.subjectId) where.subjectId = input.subjectId
        if (input.topicId) where.topicId = input.topicId
        if (input.status) where.status = input.status
        if (input.difficulty) where.difficulty = input.difficulty
        if (input.year) where.year = input.year
        if (input.search) {
          where.OR = [
            { text: { contains: input.search } },
            { explanation: { contains: input.search } },
            { source: { contains: input.search } },
            { tags: { some: { name: { contains: input.search } } } },
          ]
        }

        // Parse sort
        const [sortField, sortOrder] = input.sort.split('_')
        const orderBy: any = {}
        orderBy[sortField] = sortOrder

        const questions = await prisma.question.findMany({
          where,
          orderBy,
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          include: {
            options: { orderBy: { position: 'asc' } },
            tags: true,
            subject: { select: { id: true, name: true, color: true } },
            topic: { select: { id: true, name: true } },
            _count: { select: { attempts: true } },
          },
        })

        let nextCursor: string | undefined
        if (questions.length > input.limit) {
          const nextItem = questions.pop()
          nextCursor = nextItem!.id
        }

        return { questions, nextCursor, total: questions.length }
      }),

    count: protectedProcedure
      .input(z.object({
        subjectId: z.string().optional(),
        topicId: z.string().optional(),
        status: z.enum(['ACTIVE', 'ARCHIVED', 'FLAGGED']).optional(),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
        year: z.number().int().min(1900).max(2100).optional(),
        search: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const where: any = { userId: ctx.user.id }
        if (input.subjectId) where.subjectId = input.subjectId
        if (input.topicId) where.topicId = input.topicId
        if (input.status) where.status = input.status
        if (input.difficulty) where.difficulty = input.difficulty
        if (input.year) where.year = input.year
        if (input.search) {
          where.OR = [
            { text: { contains: input.search } },
            { explanation: { contains: input.search } },
            { source: { contains: input.search } },
            { tags: { some: { name: { contains: input.search } } } },
          ]
        }

        const [total, active, archived, flagged] = await Promise.all([
          prisma.question.count({ where }),
          prisma.question.count({ where: { ...where, status: 'ACTIVE' } }),
          prisma.question.count({ where: { ...where, status: 'ARCHIVED' } }),
          prisma.question.count({ where: { ...where, status: 'FLAGGED' } }),
        ])

        return { total, active, archived, flagged }
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const question = await prisma.question.findFirst({
          where: { id: input.id, userId: ctx.user.id },
          include: {
            options: { orderBy: { position: 'asc' } },
            answer: true,
            tags: true,
            subject: true,
            topic: true,
            reviewItems: { take: 1 },
            _count: { select: { attempts: true } },
          },
        })

        if (!question) return null

        return {
          ...question,
          reviewItem: question.reviewItems[0] || null,
          attemptsCount: question._count?.attempts ?? 0,
        }
      }),

    create: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
        options: z.array(z.object({
          label: z.enum(['A', 'B', 'C', 'D']),
          text: z.string().min(1).max(1000),
        })).length(4),
        correctLabel: z.enum(['A', 'B', 'C', 'D']),
        explanation: z.string().max(5000).optional(),
        hint: z.string().max(1000).optional(),
        source: z.string().max(200).optional(),
        year: z.number().int().min(1900).max(2100).optional(),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
        subjectId: z.string().optional(),
        topicId: z.string().optional(),
        tags: z.array(z.string().max(50)).max(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { options, tags, ...questionData } = input

        const question = await prisma.question.create({
          data: {
            ...questionData,
            userId: ctx.user.id,
            options: { create: options.map((o, i) => ({ ...o, position: i })) },
            answer: { create: { correctLabel: input.correctLabel, explanation: input.explanation } },
            tags: tags?.length ? { create: tags.map(name => ({ name, color: null })) } : undefined,
          },
          include: { options: true, answer: true, tags: true },
        })

        // Create review item for spaced repetition
        await prisma.reviewItem.create({
          data: {
            questionId: question.id,
            userId: ctx.user.id,
            status: 'NEW',
            nextReviewAt: new Date(),
          },
        })

        await logActivity(ctx.user.id, 'QUESTION_CREATED', `Created question`, question.id, 'question')
        return question
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        text: z.string().min(1).max(5000).optional(),
        explanation: z.string().max(5000).optional(),
        hint: z.string().max(1000).optional(),
        source: z.string().max(200).optional(),
        year: z.number().int().min(1900).max(2100).optional(),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
        subjectId: z.string().nullable().optional(),
        topicId: z.string().nullable().optional(),
        status: z.enum(['ACTIVE', 'ARCHIVED', 'FLAGGED']).optional(),
        tags: z.array(z.string().max(50)).max(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, tags, ...data } = input

        // Handle tags separately if provided
        if (tags !== undefined) {
          await prisma.questionTag.deleteMany({ where: { questionId: id } })
          if (tags.length > 0) {
            await prisma.questionTag.createMany({
              data: tags.map(name => ({ questionId: id, name, color: null })),
            })
          }
        }

        const question = await prisma.question.update({
          where: { id, userId: ctx.user.id },
          data,
          include: { options: true, answer: true, tags: true },
        })
        return question
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.question.delete({
          where: { id: input.id, userId: ctx.user.id },
        })
        return { success: true }
      }),

    bulkUpdate: protectedProcedure
      .input(z.object({
        questionIds: z.array(z.string()).min(1).max(100),
        action: z.enum(['archive', 'restore', 'delete', 'changeSubject', 'changeDifficulty']),
        subjectId: z.string().nullable().optional(),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = await prisma.$transaction(async (tx) => {
          const items: any[] = []

          for (const questionId of input.questionIds) {
            try {
              let result: any = { questionId, success: true }

              switch (input.action) {
                case 'archive':
                  await tx.question.update({
                    where: { id: questionId, userId: ctx.user.id },
                    data: { status: 'ARCHIVED' },
                  })
                  break
                case 'restore':
                  await tx.question.update({
                    where: { id: questionId, userId: ctx.user.id },
                    data: { status: 'ACTIVE' },
                  })
                  break
                case 'delete':
                  await tx.question.delete({
                    where: { id: questionId, userId: ctx.user.id },
                  })
                  break
                case 'changeSubject':
                  await tx.question.update({
                    where: { id: questionId, userId: ctx.user.id },
                    data: { subjectId: input.subjectId },
                  })
                  break
                case 'changeDifficulty':
                  await tx.question.update({
                    where: { id: questionId, userId: ctx.user.id },
                    data: { difficulty: input.difficulty },
                  })
                  break
              }

              items.push(result)
            } catch (error) {
              items.push({ questionId, success: false, error: 'Operation failed' })
            }
          }

          return items
        })

        return { results }
      }),

    duplicate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const original = await prisma.question.findFirst({
          where: { id: input.id, userId: ctx.user.id },
          include: { options: true, answer: true, tags: true },
        })

        if (!original) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })

        const duplicate = await prisma.question.create({
          data: {
            text: original.text + ' (Copy)',
            explanation: original.explanation,
            hint: original.hint,
            source: original.source,
            year: original.year,
            difficulty: original.difficulty,
            subjectId: original.subjectId,
            topicId: original.topicId,
            userId: ctx.user.id,
            options: { create: original.options.map((o, i) => ({ label: o.label, text: o.text, position: i })) },
            answer: { create: { correctLabel: original.answer?.correctLabel || 'A', explanation: original.answer?.explanation } },
            tags: original.tags.length ? { create: original.tags.map(t => ({ name: t.name, color: t.color })) } : undefined,
          },
          include: { options: true, answer: true, tags: true },
        })

        await prisma.reviewItem.create({
          data: { questionId: duplicate.id, userId: ctx.user.id, status: 'NEW', nextReviewAt: new Date() },
        })

        await logActivity(ctx.user.id, 'QUESTION_CREATED', `Duplicated question`, duplicate.id, 'question')
        return duplicate
      }),
  }),

  // Attempts
  attempts: createTRPCRouter({
    submit: protectedProcedure
      .input(z.object({
        questionId: z.string(),
        selectedLabel: z.enum(['A', 'B', 'C', 'D']),
        timeSpentMs: z.number().int().positive().optional(),
        sessionId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const question = await prisma.question.findFirst({
          where: { id: input.questionId, userId: ctx.user.id },
          include: { answer: true, reviewItems: { take: 1 } },
        })
        if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
        if (!question.answer) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Question has no answer key' })

        const isCorrect = input.selectedLabel === question.answer.correctLabel

        // Create attempt
        const attempt = await prisma.attempt.create({
          data: {
            questionId: input.questionId,
            userId: ctx.user.id,
            selectedLabel: input.selectedLabel,
            isCorrect,
            timeSpentMs: input.timeSpentMs,
            sessionId: input.sessionId,
          },
        })

        // Update review item (spaced repetition)
        await updateReviewItem(ctx.user.id, input.questionId, isCorrect, question.reviewItems[0])

        // Update session if part of one
        if (input.sessionId) {
          await prisma.practiceSession.update({
            where: { id: input.sessionId, userId: ctx.user.id },
            data: {
              correctCount: { increment: isCorrect ? 1 : 0 },
              currentIndex: { increment: 1 },
              totalTimeMs: { increment: input.timeSpentMs ?? 0 },
            },
          })
        }

        // Log activity
        await logActivity(
          ctx.user.id,
          'QUESTION_ANSWERED',
          `Answered "${question.text.slice(0, 50)}..." ${isCorrect ? 'correctly' : 'incorrectly'}`,
          question.id,
          'question',
          { isCorrect, selectedLabel: input.selectedLabel }
        )

        return { attempt, isCorrect, correctLabel: question.answer.correctLabel, explanation: question.answer.explanation }
      }),

    list: protectedProcedure
      .input(z.object({
        questionId: z.string().optional(),
        sessionId: z.string().optional(),
        limit: z.number().default(50),
        cursor: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const where: any = { userId: ctx.user.id }
        if (input.questionId) where.questionId = input.questionId
        if (input.sessionId) where.sessionId = input.sessionId

        const attempts = await prisma.attempt.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          include: { question: { select: { id: true, text: true } } },
        })

        let nextCursor: string | undefined
        if (attempts.length > input.limit) {
          const nextItem = attempts.pop()
          nextCursor = nextItem!.id
        }

        return { attempts, nextCursor }
      }),
  }),

  // Revision / Practice Sessions
  revision: createTRPCRouter({
    dueQueue: protectedProcedure.query(async ({ ctx }) => {
      const timezone = await getUserTimezone(ctx.user.id)
      const now = new Date()
      const startOfDay = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
      startOfDay.setHours(0, 0, 0, 0)

      const reviewItems = await prisma.reviewItem.findMany({
        where: {
          userId: ctx.user.id,
          status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] },
          nextReviewAt: { lte: now },
        },
        include: {
          question: {
            include: {
              options: { orderBy: { position: 'asc' } },
              answer: true,
              subject: { select: { id: true, name: true, color: true } },
              topic: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { nextReviewAt: 'asc' },
      })

      return reviewItems.map(item => ({
        ...item,
        question: item.question,
      }))
    }),

    startSession: protectedProcedure
      .input(z.object({
        questionIds: z.array(z.string()).min(1),
        title: z.string().optional(),
        type: z.enum(['PRACTICE', 'REVISION', 'QUIZ', 'EXAM']).default('REVISION'),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await prisma.practiceSession.create({
          data: {
            userId: ctx.user.id,
            title: input.title,
            type: input.type,
            questionCount: input.questionIds.length,
          },
        })

        await logActivity(ctx.user.id, 'SESSION_STARTED', `Started ${input.type.toLowerCase()} session`, session.id, 'session')
        return session
      }),

    submitAnswer: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        questionId: z.string(),
        selectedLabel: z.enum(['A', 'B', 'C', 'D']),
        timeSpentMs: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        // This delegates to attempts.submit for consistency
        return ctx.prisma.$transaction(async (tx) => {
          const question = await tx.question.findFirst({
            where: { id: input.questionId, userId: ctx.user.id },
            include: { answer: true, reviewItems: { take: 1 } },
          })
          if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
          if (!question.answer) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Question has no answer key' })

          const isCorrect = input.selectedLabel === question.answer.correctLabel

          const attempt = await tx.attempt.create({
            data: {
              questionId: input.questionId,
              userId: ctx.user.id,
              selectedLabel: input.selectedLabel,
              isCorrect,
              timeSpentMs: input.timeSpentMs,
              sessionId: input.sessionId,
            },
          })

          await updateReviewItemTx(tx, ctx.user.id, input.questionId, isCorrect, question.reviewItems[0])

          await tx.practiceSession.update({
            where: { id: input.sessionId, userId: ctx.user.id },
            data: {
              correctCount: { increment: isCorrect ? 1 : 0 },
              currentIndex: { increment: 1 },
              totalTimeMs: { increment: input.timeSpentMs },
            },
          })

          return { attempt, isCorrect, correctLabel: question.answer.correctLabel, explanation: question.answer.explanation }
        })
      }),

    completeSession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const session = await prisma.practiceSession.update({
          where: { id: input.sessionId, userId: ctx.user.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        })

        await logActivity(
          ctx.user.id,
          'SESSION_COMPLETED',
          `Completed session "${session.title ?? 'Practice'}"`,
          session.id,
          'session',
          { correctCount: session.correctCount, totalQuestions: session.questionCount }
        )

        return session
      }),

    abandonSession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const session = await prisma.practiceSession.update({
          where: { id: input.sessionId, userId: ctx.user.id },
          data: { status: 'ABANDONED', completedAt: new Date() },
        })

        await logActivity(ctx.user.id, 'SESSION_ABANDONED', `Abandoned session`, session.id, 'session')
        return session
      }),
  }),

  // Imports (AI Studio) - Use dedicated router
  imports: importsRouter,

  // ============================================
  // COLLECTIONS
  // ============================================
  collections: createTRPCRouter({
    list: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        subjectId: z.string().optional(),
        sort: z.enum(['recent', 'name', 'questionCount', 'accuracy', 'lastPracticed']).default('recent'),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const { query, subjectId, sort, page, pageSize } = input
        const where: any = { userId: ctx.user.id, status: 'ACTIVE' }

        if (query) {
          where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ]
        }
        if (subjectId) where.defaultSubjectId = subjectId

        const orderBy: any = {}
        switch (sort) {
          case 'name': orderBy.name = 'asc'; break
          case 'questionCount': orderBy.updatedAt = 'desc'; break
          case 'accuracy': orderBy.updatedAt = 'desc'; break
          case 'lastPracticed': orderBy.updatedAt = 'desc'; break
          default: orderBy.updatedAt = 'desc'
        }

        const [collections, total] = await Promise.all([
          prisma.collection.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
              _count: { select: { questions: true } },
              questions: {
                where: { question: { status: 'ACTIVE' } },
                select: { questionId: true },
              },
              activity: {
                where: { activityType: 'PRACTICED' },
                select: { createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          }),
          prisma.collection.count({ where }),
        ])

        const collectionCards = await Promise.all(
          collections.map(async (c) => {
            const questionIds = c.questions.map(q => q.questionId)
            let accuracy = null
            let attemptedCount = 0

            if (questionIds.length > 0) {
              const attempts = await prisma.attempt.findMany({
                where: { questionId: { in: questionIds }, userId: ctx.user.id },
                select: { isCorrect: true },
              })
              attemptedCount = attempts.length
              const correctCount = attempts.filter(a => a.isCorrect).length
              accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : null
            }

            return {
              id: c.id,
              name: c.name,
              description: c.description,
              color: c.color,
              icon: c.icon,
              isPinned: c.isPinned,
              questionCount: c._count.questions,
              attemptedCount,
              accuracy,
              lastPracticed: c.activity[0]?.createdAt ?? null,
              createdAt: c.createdAt,
            }
          })
        )

        return { collections: collectionCards, total, page, pageSize }
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const collection = await prisma.collection.findFirst({
          where: { id: input.id, userId: ctx.user.id },
          include: {
            _count: { select: { questions: true } },
            questions: {
              include: { question: { include: { subject: true, topic: true, answer: true } } },
              orderBy: { sortOrder: 'asc' },
            },
          },
        })
        if (!collection) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })

        const questionIds = collection.questions.map(q => q.questionId)
        let accuracy = null
        let attemptedCount = 0
        let masteredCount = 0

        if (questionIds.length > 0) {
          const attempts = await prisma.attempt.findMany({
            where: { questionId: { in: questionIds }, userId: ctx.user.id },
            select: { isCorrect: true, questionId: true },
          })
          attemptedCount = attempts.length
          const correctCount = attempts.filter(a => a.isCorrect).length
          accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : null

          const questionSet = new Set(questionIds)
          const reviewItems = await prisma.reviewItem.findMany({
            where: { userId: ctx.user.id, questionId: { in: Array.from(questionSet) } },
            select: { questionId: true, status: true },
          })
          masteredCount = reviewItems.filter(r => r.status === 'MASTERED').length
        }

        return {
          ...collection,
          questions: collection.questions.map(q => ({
            ...q,
            question: q.question,
          })),
          accuracy,
          attemptedCount,
          masteredCount,
        }
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().optional(),
        defaultSubjectId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const maxPosition = await prisma.collection.findFirst({
          where: { userId: ctx.user.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })

        const collection = await prisma.collection.create({
          data: {
            ...input,
            userId: ctx.user.id,
          },
        })

        await logActivity(ctx.user.id, 'QUESTION_CREATED', `Created collection "${collection.name}"`, collection.id, 'collection')
        return collection
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().optional(),
        defaultSubjectId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input
        const collection = await prisma.collection.update({
          where: { id, userId: ctx.user.id },
          data,
        })
        return collection
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collection = await prisma.collection.update({
          where: { id: input.id, userId: ctx.user.id },
          data: { status: 'ARCHIVED', archivedAt: new Date() },
        })
        return collection
      }),

    restore: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collection = await prisma.collection.update({
          where: { id: input.id, userId: ctx.user.id },
          data: { status: 'ACTIVE', archivedAt: null },
        })
        return collection
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.$transaction(async (tx) => {
          await tx.collectionQuestion.deleteMany({
            where: { collectionId: input.id },
          })
          await tx.collectionActivity.deleteMany({
            where: { collectionId: input.id },
          })
          await prisma.collection.delete({
            where: { id: input.id, userId: ctx.user.id },
          })
        })
        return { success: true }
      }),

    togglePinned: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collection = await prisma.collection.findFirst({
          where: { id: input.id, userId: ctx.user.id },
        })
        if (!collection) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })

        return prisma.collection.update({
          where: { id: input.id, userId: ctx.user.id },
          data: { isPinned: !collection.isPinned },
        })
      }),

    addQuestions: protectedProcedure
      .input(z.object({
        collectionId: z.string(),
        questionIds: z.array(z.string()).min(1).max(200),
      }))
      .mutation(async ({ ctx, input }) => {
        const { collectionId, questionIds } = input

        const collection = await prisma.collection.findFirst({
          where: { id: collectionId, userId: ctx.user.id },
        })
        if (!collection) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })

        const results = await prisma.$transaction(async (tx) => {
          const maxSort = await tx.collectionQuestion.aggregate({
            where: { collectionId },
            _max: { sortOrder: true },
          })
          const baseSort = (maxSort._max.sortOrder ?? 0) + 1

          const inserted: any[] = []
          const skipped: any[] = []

          for (let i = 0; i < questionIds.length; i++) {
            const questionId = questionIds[i]
            const question = await tx.question.findFirst({
              where: { id: questionId, userId: ctx.user.id },
            })
            if (!question) {
              skipped.push({ questionId, reason: 'Question not found' })
              continue
            }

            const existing = await tx.collectionQuestion.findUnique({
              where: { collectionId_questionId: { collectionId, questionId } },
            })
            if (existing) {
              skipped.push({ questionId, reason: 'Already in collection' })
              continue
            }

            await tx.collectionQuestion.create({
              data: {
                collectionId,
                questionId,
                sortOrder: baseSort + i,
              },
            })
            inserted.push(questionId)
          }

          await prisma.collection.update({
            where: { id: collectionId },
            data: { updatedAt: new Date() },
          })

          return { inserted, skipped }
        })

        await logActivity(ctx.user.id, 'QUESTION_ADDED', `Added questions to collection`, collectionId, 'collection')
        return results
      }),

    removeQuestion: protectedProcedure
      .input(z.object({ collectionId: z.string(), questionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.collectionQuestion.deleteMany({
          where: {
            collectionId: input.collectionId,
            questionId: input.questionId,
          },
        })
        await prisma.collection.update({
          where: { id: input.collectionId },
          data: { updatedAt: new Date() },
        })
        return { success: true }
      }),

    reorderQuestions: protectedProcedure
      .input(z.object({
        collectionId: z.string(),
        orderedQuestionIds: z.array(z.object({ questionId: z.string(), sortOrder: z.number() })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { collectionId, orderedQuestionIds } = input

        const collection = await prisma.collection.findFirst({
          where: { id: collectionId, userId: ctx.user.id },
        })
        if (!collection) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })

        await prisma.$transaction(async (tx) => {
          for (const { questionId, sortOrder } of orderedQuestionIds) {
            await tx.collectionQuestion.update({
              where: { collectionId_questionId: { collectionId, questionId } },
              data: { sortOrder },
            })
          }
        })

        await prisma.collection.update({
          where: { id: collectionId },
          data: { updatedAt: new Date() },
        })

        await logActivity(ctx.user.id, 'REORDERED', `Reordered collection questions`, collectionId, 'collection')
        return { success: true }
      }),

    duplicate: protectedProcedure
      .input(z.object({ id: z.string(), newName: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const collection = await prisma.collection.findFirst({
          where: { id: input.id, userId: ctx.user.id },
          include: { questions: true },
        })
        if (!collection) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })

        const newName = input.newName ?? `${collection.name} (Copy)`
        const newCollection = await prisma.collection.create({
          data: {
            userId: ctx.user.id,
            name: newName,
            description: collection.description,
            color: collection.color,
            icon: collection.icon,
            defaultSubjectId: collection.defaultSubjectId,
          },
        })

        if (collection.questions.length > 0) {
          await prisma.collectionQuestion.createMany({
            data: collection.questions.map((q, i) => ({
              collectionId: newCollection.id,
              questionId: q.questionId,
              sortOrder: i,
            })),
          })
        }

        await logActivity(ctx.user.id, 'QUESTION_CREATED', `Duplicated collection`, newCollection.id, 'collection')
        return newCollection
      }),

    startPractice: protectedProcedure
      .input(z.object({
        collectionId: z.string(),
        count: z.number().int().min(1).max(100).optional(),
        mode: z.enum(['PRACTICE', 'REVISION', 'QUIZ', 'EXAM']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { collectionId, count = 10, mode = 'PRACTICE' } = input

        const collection = await prisma.collection.findFirst({
          where: { id: collectionId, userId: ctx.user.id },
          include: { questions: { where: { question: { status: 'ACTIVE' } } } },
        })
        if (!collection) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })

        const questionIds = collection.questions
          .map(q => q.questionId)
          .sort(() => Math.random() - 0.5)
          .slice(0, count)

        if (questionIds.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Collection has no active questions' })
        }

        const session = await prisma.practiceSession.create({
          data: {
            userId: ctx.user.id,
            title: `Collection: ${collection.name}`,
            type: mode,
            questionCount: questionIds.length,
          },
        })

        await logActivity(ctx.user.id, 'SESSION_STARTED', `Started collection practice`, session.id, 'session')
        return session
      }),

    summary: protectedProcedure
      .input(z.object({
        collectionId: z.string(),
        range: z.object({
          from: z.string().optional(),
          to: z.string().optional(),
        }).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { collectionId } = input
        const range = input.range ?? {}

        const collection = await prisma.collection.findFirst({
          where: { id: collectionId, userId: ctx.user.id },
          include: { questions: true },
        })
        if (!collection) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })

        const questionIds = collection.questions.map(q => q.questionId)

        let attempts = await prisma.attempt.findMany({
          where: { questionId: { in: questionIds }, userId: ctx.user.id },
          select: { isCorrect: true, questionId: true, createdAt: true },
        })

        if (range.from) {
          const fromDate = new Date(range.from)
          attempts = attempts.filter(a => new Date(a.createdAt) >= fromDate)
        }
        if (range.to) {
          const toDate = new Date(range.to)
          attempts = attempts.filter(a => new Date(a.createdAt) <= toDate)
        }

        const totalAttempts = attempts.length
        const correctCount = attempts.filter(a => a.isCorrect).length
        const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : null

        const attemptedQuestionIds = new Set(attempts.map(a => a.questionId))
        const activeQuestions = collection.questions.length

        return {
          collectionId,
          collectionName: collection.name,
          totalQuestions: activeQuestions,
          attemptedQuestions: attemptedQuestionIds.size,
          attempts: totalAttempts,
          correctAttempts: correctCount,
          accuracy,
          completionRate: activeQuestions > 0 ? (attemptedQuestionIds.size / activeQuestions) * 100 : 0,
        }
      }),
  }),

  // ============================================
  // NOTES
  // ============================================
  notes: createTRPCRouter({
    list: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        categoryId: z.string().optional(),
        subjectId: z.string().optional(),
        sort: z.enum(['updatedAt_desc', 'createdAt_desc', 'title_asc', 'pinned_first']).default('updatedAt_desc'),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const { query, categoryId, subjectId, sort, page, pageSize } = input
        const where: any = { userId: ctx.user.id }

        if (query) {
          where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { body: { contains: query, mode: 'insensitive' } },
          ]
        }
        if (categoryId) where.categoryId = categoryId
        if (subjectId) where.subjectId = subjectId

        const orderBy: any = {}
        const [sortField, sortOrder] = sort.split('_')
        if (sortField === 'pinned') {
          orderBy.isPinned = 'desc'
          orderBy.updatedAt = 'desc'
        } else {
          orderBy[sortField as string] = sortOrder as any
        }

        const [notes, total] = await Promise.all([
          prisma.note.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
              subject: { select: { id: true, name: true, color: true } },
              category: { select: { id: true, name: true, color: true } },
              _count: { select: { questions: true } },
            },
          }),
          prisma.note.count({ where }),
        ])

        return { notes, total, page, pageSize }
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const note = await prisma.note.findFirst({
          where: { id: input.id, userId: ctx.user.id },
          include: {
            subject: { select: { id: true, name: true, color: true } },
            topic: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
            questions: {
              include: {
                question: {
                  include: {
                    subject: { select: { id: true, name: true, color: true } },
                    topic: { select: { id: true, name: true } },
                    _count: { select: { attempts: true } },
                  },
                },
              },
            },
          },
        })
        if (!note) return null

        return {
          ...note,
          linkedQuestions: note.questions.map(nq => ({
            ...nq.question,
            personalAccuracy: nq.question._count.attempts > 0
              ? null // Would need to calculate per-question
              : null,
          })),
        }
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        body: z.string().max(100000),
        bodyFormat: z.enum(['MARKDOWN', 'STRUCTURED_TEXT']).optional(),
        subjectId: z.string().optional(),
        topicId: z.string().optional(),
        categoryId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const note = await prisma.note.create({
          data: {
            ...input,
            userId: ctx.user.id,
            bodyFormat: input.bodyFormat ?? 'MARKDOWN',
            status: 'ACTIVE',
            version: 1,
          },
        })
        await logActivity(ctx.user.id, 'NOTE_CREATED', `Created note "${note.title}"`, note.id, 'note')
        return note
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        body: z.string().max(100000).optional(),
        bodyFormat: z.enum(['MARKDOWN', 'STRUCTURED_TEXT']).optional(),
        subjectId: z.string().nullable().optional(),
        topicId: z.string().nullable().optional(),
        categoryId: z.string().nullable().optional(),
        version: z.number().int().min(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input

        if (data.version) {
          const existing = await prisma.note.findFirst({
            where: { id, userId: ctx.user.id },
          })
          if (existing && existing.version !== data.version) {
            // Create revision before updating
            await prisma.noteRevision.create({
              data: {
                noteId: id,
                userId: ctx.user.id,
                version: existing.version,
                title: existing.title,
                body: existing.body,
              },
            })
          }
        }

        const note = await prisma.note.update({
          where: { id, userId: ctx.user.id },
          data: { ...data, updatedAt: new Date(), version: { increment: 1 } },
        })
        return note
      }),

    autosave: protectedProcedure
      .input(z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(200),
        body: z.string().max(100000),
        bodyFormat: z.enum(['MARKDOWN', 'STRUCTURED_TEXT']).optional(),
        subjectId: z.string().optional(),
        topicId: z.string().optional(),
        categoryId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.id) {
          return prisma.note.update({
            where: { id: input.id, userId: ctx.user.id },
            data: {
              title: input.title,
              body: input.body,
              bodyFormat: input.bodyFormat ?? 'MARKDOWN',
              subjectId: input.subjectId,
              topicId: input.topicId,
              categoryId: input.categoryId,
              updatedAt: new Date(),
              lastSavedAt: new Date(),
            },
          })
        } else {
          const note = await prisma.note.create({
            data: {
              ...input,
              userId: ctx.user.id,
              status: 'DRAFT',
              version: 1,
            },
          })
          return note
        }
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return prisma.note.update({
          where: { id: input.id, userId: ctx.user.id },
          data: { status: 'ARCHIVED', archivedAt: new Date() },
        })
      }),

    restore: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return prisma.note.update({
          where: { id: input.id, userId: ctx.user.id },
          data: { status: 'ACTIVE', archivedAt: null },
        })
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.note.delete({
          where: { id: input.id, userId: ctx.user.id },
        })
        return { success: true }
      }),

    togglePinned: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const note = await prisma.note.findFirst({
          where: { id: input.id, userId: ctx.user.id },
        })
        if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' })

        return prisma.note.update({
          where: { id: input.id, userId: ctx.user.id },
          data: { isPinned: !note.isPinned },
        })
      }),

    linkQuestion: protectedProcedure
      .input(z.object({ noteId: z.string(), questionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { noteId, questionId } = input

        const note = await prisma.note.findFirst({
          where: { id: noteId, userId: ctx.user.id },
        })
        if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' })

        const question = await prisma.question.findFirst({
          where: { id: questionId, userId: ctx.user.id },
        })
        if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })

        const existing = await prisma.noteQuestion.findUnique({
          where: { noteId_questionId: { noteId, questionId } },
        })
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Question already linked' })

        const link = await prisma.noteQuestion.create({
          data: { noteId, questionId },
        })
        return link
      }),

    unlinkQuestion: protectedProcedure
      .input(z.object({ noteId: z.string(), questionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.noteQuestion.deleteMany({
          where: { noteId: input.noteId, questionId: input.questionId },
        })
        return { success: true }
      }),

    relatedQuestions: protectedProcedure
      .input(z.object({ noteId: z.string() }))
      .query(async ({ ctx, input }) => {
        const note = await prisma.note.findFirst({
          where: { id: input.noteId, userId: ctx.user.id },
        })
        if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' })

        const links = await prisma.noteQuestion.findMany({
          where: { noteId: input.noteId },
          include: {
            question: {
              include: {
                subject: { select: { id: true, name: true, color: true } },
                topic: { select: { id: true, name: true } },
                reviewItems: { take: 1 },
                _count: { select: { attempts: true } },
              },
            },
          },
        })

        return links.map(l => ({
          ...l.question,
          personalAccuracy: l.question._count.attempts > 0 ? null : null,
        }))
      }),

    createCategory: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        description: z.string().max(200).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

        const exists = await prisma.noteCategory.findFirst({
          where: { userId: ctx.user.id, slug },
        })
        if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'Category already exists' })

        const category = await prisma.noteCategory.create({
          data: {
            ...input,
            userId: ctx.user.id,
            slug,
          },
        })
        return category
      }),

    updateCategory: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input
        return prisma.noteCategory.update({
          where: { id, userId: ctx.user.id },
          data,
        })
      }),

    deleteCategory: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.noteCategory.delete({
          where: { id: input.id, userId: ctx.user.id },
        })
        return { success: true }
      }),
  }),

  // ============================================
  // ANALYTICS
  // ============================================
  analytics: createTRPCRouter({
    summary: protectedProcedure
      .input(z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        timezone: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const timezone = input.timezone ?? await getUserTimezone(userId)
        const now = new Date()

        const defaultTo = new Date()
        defaultTo.setHours(0, 0, 0, 0)

        const defaultFrom = new Date(defaultTo)
        defaultFrom.setDate(defaultFrom.getDate() - 30)

        const from = input.from ? new Date(input.from) : defaultFrom
        const to = input.to ? new Date(input.to) : defaultTo

        const [
          questionCount,
          attemptedAttempts,
          totalAttempts,
          studyTimeSeconds,
          streakDays,
          dueTodayCount,
        ] = await Promise.all([
          prisma.question.count({ where: { userId, status: 'ACTIVE' } }),
          prisma.attempt.count({
            where: { userId, createdAt: { gte: from, lte: to } },
          }),
          prisma.attempt.groupBy({
            by: ['isCorrect'],
            where: { userId, createdAt: { gte: from, lte: to } },
            _count: true,
          }),
          prisma.practiceSession.aggregate({
            where: { userId, status: 'COMPLETED' },
            _sum: { totalTimeMs: true },
          }),
          calculateStreak(userId),
          prisma.reviewItem.count({
            where: {
              userId,
              nextReviewAt: { lte: to },
              status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] },
            },
          }),
        ])

        const totalAttemptsCount = attemptedAttempts
        const correctCount = totalAttempts.find((a: any) => a.isCorrect)?._count ?? 0
        const accuracy = totalAttemptsCount > 0 ? (correctCount / totalAttemptsCount) * 100 : null

        return {
          questionCount,
          attemptedCount: totalAttemptsCount,
          totalAttempts: totalAttemptsCount,
          correctAttempts: correctCount,
          accuracy,
          studyTimeSeconds: Math.floor((studyTimeSeconds._sum?.totalTimeMs ?? 0) / 1000),
          studyStreakDays: streakDays,
          dueTodayCount,
          previousPeriod: {
            questionCount,
            attemptedCount: totalAttemptsCount,
            accuracy: accuracy,
          },
        }
      }),

    accuracyTrend: protectedProcedure
      .input(z.object({
        from: z.string(),
        to: z.string(),
        bucket: z.enum(['daily', 'weekly']).optional(),
        timezone: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const timezone = input.timezone ?? await getUserTimezone(userId)
        const from = new Date(input.from)
        const to = new Date(input.to)
        const bucket = input.bucket ?? (to.getTime() - from.getTime() > 30 * 24 * 60 * 60 * 1000 ? 'weekly' : 'daily')

        const attempts = await prisma.attempt.findMany({
          where: { userId, createdAt: { gte: from, lte: to } },
          select: { isCorrect: true, createdAt: true },
        })

        if (attempts.length === 0) return []

        const buckets = new Map<string, { attempts: number; correct: number }>()

        for (const attempt of attempts) {
          let key: string
          const date = new Date(attempt.createdAt)

          if (bucket === 'daily') {
            const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
            key = localDate.toISOString().split('T')[0]
          } else {
            const startOfWeek = new Date(date)
            const dayOfWeek = startOfWeek.getDay()
            const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
            startOfWeek.setDate(diff)
            startOfWeek.setHours(0, 0, 0, 0)
            key = startOfWeek.toISOString().split('T')[0]
          }

          if (!buckets.has(key)) {
            buckets.set(key, { attempts: 0, correct: 0 })
          }
          const bucketData = buckets.get(key)!
          bucketData.attempts++
          if (attempt.isCorrect) bucketData.correct++
        }

        return Array.from(buckets.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            attempts: data.attempts,
            correct: data.correct,
            accuracy: Math.round((data.correct / data.attempts) * 100),
          }))
      }),

    bySubject: protectedProcedure
      .input(z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        timezone: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const timezone = input.timezone ?? await getUserTimezone(userId)
        const now = new Date()
        const to = input.to ? new Date(input.to) : new Date(now.toLocaleString('en-US', { timeZone: timezone }))
        to.setHours(0, 0, 0, 0)
        const from = input.from ? new Date(input.from) : new Date(to)
        from.setDate(from.getDate() - 30)

        const subjects = await prisma.subject.findMany({
          where: { userId },
          orderBy: { position: 'asc' },
          include: {
            _count: { select: { questions: true } },
            topics: { select: { id: true, name: true } },
          },
        })

        const result = await Promise.all(subjects.map(async (subject) => {
          const questions = await prisma.question.findMany({
            where: { subjectId: subject.id, userId, status: 'ACTIVE' },
            select: { id: true },
          })
          const questionIds = questions.map(q => q.id)

          let attempts = await prisma.attempt.findMany({
            where: { questionId: { in: questionIds }, userId },
            select: { isCorrect: true, questionId: true, createdAt: true },
          })

          if (input.from && input.to) {
            attempts = attempts.filter(a => {
              const d = new Date(a.createdAt)
              return d >= from && d <= to
            })
          }

          const totalAttempts = attempts.length
          const correctCount = attempts.filter(a => a.isCorrect).length
          const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : null

          return {
            subjectId: subject.id,
            subjectName: subject.name,
            attempts: totalAttempts,
            correct: correctCount,
            accuracy,
            questionsAttempted: new Set(attempts.map(a => a.questionId)).size,
            trend: accuracy !== null ? 'stable' as const : 'no-data' as const,
          }
        }))

        return result.filter(s => s.attempts > 0)
      }),

    byChapter: protectedProcedure
      .input(z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        subjectId: z.string().optional(),
        timezone: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const timezone = input.timezone ?? await getUserTimezone(userId)
        const now = new Date()
        const to = input.to ? new Date(input.to) : new Date(now.toLocaleString('en-US', { timeZone: timezone }))
        to.setHours(0, 0, 0, 0)
        const from = input.from ? new Date(input.from) : new Date(to)
        from.setDate(from.getDate() - 30)

        const topics = await prisma.topic.findMany({
          where: { subjectId: input.subjectId, userId },
          include: { questions: { select: { id: true } } },
        })

        const result = await Promise.all(topics.map(async (topic) => {
          const questionIds = topic.questions.map(q => q.id)
          const attempts = await prisma.attempt.findMany({
            where: { questionId: { in: questionIds }, userId },
            select: { isCorrect: true, questionId: true, createdAt: true },
          })

          if (input.from && input.to) {
            attempts.filter(a => {
              const d = new Date(a.createdAt)
              return d >= from && d <= to
            })
          }

          const totalAttempts = attempts.length
          const correctCount = attempts.filter(a => a.isCorrect).length
          const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : null
          const distinctQuestions = new Set(attempts.map(a => a.questionId)).size

          let status: string
          if (totalAttempts < 5) {
            status = 'Not enough data'
          } else if (accuracy !== null && accuracy >= 75) {
            status = 'Strong'
          } else if (accuracy !== null && accuracy >= 50) {
            status = 'Developing'
          } else {
            status = 'Needs focus'
          }

          return {
            chapterId: topic.id,
            chapter: topic.name,
            subjectId: topic.subjectId,
            questions: distinctQuestions,
            attempts: totalAttempts,
            correct: correctCount,
            accuracy,
            status,
            trend: 'stable' as const,
          }
        }))

        return result
      }),

    activity: protectedProcedure
      .input(z.object({
        from: z.string(),
        to: z.string(),
        timezone: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const timezone = input.timezone ?? await getUserTimezone(userId)
        const from = new Date(input.from)
        const to = new Date(input.to)

        const activity = await prisma.activityEvent.findMany({
          where: { userId, createdAt: { gte: from, lte: to } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            metadata: true,
          },
          take: 50,
        })

        return activity.map(a => ({
          ...a,
          occurredAt: a.createdAt.toISOString(),
        }))
      }),

    recommendation: protectedProcedure
      .input(z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        timezone: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const timezone = input.timezone ?? await getUserTimezone(userId)
        const now = new Date()
        const to = input.to ? new Date(input.to) : new Date(now.toLocaleString('en-US', { timeZone: timezone }))
        to.setHours(0, 0, 0, 0)
        const from = input.from ? new Date(input.from) : new Date(to)
        from.setDate(from.getDate() - 30)

        const [dueReviews, recentAttempts, recentActivity] = await Promise.all([
          prisma.reviewItem.count({
            where: {
              userId,
              nextReviewAt: { lte: to },
              status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] },
            },
          }),
          prisma.attempt.findMany({
            where: { userId, createdAt: { gte: from, lte: to } },
            select: { isCorrect: true, questionId: true },
          }),
          prisma.activityEvent.findMany({
            where: { userId, createdAt: { gte: from, lte: to } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          }),
        ])

        const totalAttempts = recentAttempts.length
        const correctCount = recentAttempts.filter(a => a.isCorrect).length
        const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : null

        let action: string
        let reason: string

        if (dueReviews > 0) {
          action = 'start-due-review'
          reason = `You have ${dueReviews} due review${dueReviews > 1 ? 's' : ''} waiting for you.`
        } else if (totalAttempts === 0) {
          action = 'start-practice'
          reason = 'Start a short practice session to build up your analytics data.'
        } else if (accuracy !== null && accuracy < 60) {
          const incorrectQuestions = recentAttempts.filter(a => !a.isCorrect)
          const uniqueIncorrect = new Set(incorrectQuestions.map(a => a.questionId)).size
          action = 'review-incorrect'
          reason = `Your accuracy is ${Math.round(accuracy)}% across ${totalAttempts} attempts. Review your recent incorrect answers.`
        } else if (accuracy !== null && accuracy >= 80) {
          action = 'mixed-challenge'
          reason = `Great work! Your accuracy is ${Math.round(accuracy)}%. Try a mixed challenge to push further.`
        } else if (recentActivity.length === 0) {
          action = 'start-practice'
          reason = "It looks like you haven't practiced recently. Start a short session to stay sharp."
        } else {
          action = 'continue-practice'
          reason = `Keep going! Your accuracy is ${accuracy !== null ? Math.round(accuracy) : 0}% across ${totalAttempts} attempts.`
        }

        return { action, reason, accuracy, totalAttempts, dueReviews }
      }),
  }),

  // ============================================
  // SETTINGS (extended)
  // ============================================
  settings: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
      const [userSettings, notificationSettings, user] = await Promise.all([
        prisma.userSettings.findUnique({ where: { userId: ctx.user.id } }),
        prisma.notificationSettings.findUnique({ where: { userId: ctx.user.id } }),
        prisma.user.findUnique({ where: { id: ctx.user.id }, select: { id: true, name: true, email: true, image: true } }),
      ])
      return { userSettings, notificationSettings, user }
    }),

    update: protectedProcedure
      .input(z.object({
        timezone: z.string().optional(),
        theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
        emailNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
        dailyReminder: z.boolean().optional(),
        reminderTime: z.string().optional(),
        masteryThreshold: z.number().int().min(1).max(10).optional(),
        easeFactorDefault: z.number().min(1.3).max(3.0).optional(),
        dailyQuestionGoal: z.number().int().min(1).optional(),
        dailyMinuteGoal: z.number().int().min(1).optional(),
        defaultPracticeMode: z.enum(['QUICK', 'SUBJECT', 'WEAK', 'REVIEW', 'MOCK']).optional(),
        defaultQuestionCount: z.number().int().min(1).optional(),
        timerPreference: z.enum(['OFF', 'ELAPSED', 'COUNTDOWN']).optional(),
        defaultDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
        explanationPreference: z.enum(['IMMEDIATE', 'END_OF_SESSION']).optional(),
        hintPreference: z.enum(['ALLOWED', 'DISABLED']).optional(),
        weekendReview: z.enum(['NORMAL', 'REDUCED', 'OFF']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return prisma.userSettings.upsert({
          where: { userId: ctx.user.id },
          create: { userId: ctx.user.id, ...input },
          update: input,
        })
      }),

    updateNotifications: protectedProcedure
      .input(z.object({
        dueReviewEnabled: z.boolean().optional(),
        dailyGoalEnabled: z.boolean().optional(),
        importCompletionEnabled: z.boolean().optional(),
        practiceCompletionEnabled: z.boolean().optional(),
        preferredHour: z.number().int().min(0).max(23).optional(),
        inAppEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return prisma.notificationSettings.upsert({
          where: { userId: ctx.user.id },
          create: { userId: ctx.user.id, ...input },
          update: input,
        })
      }),

    getSessions: protectedProcedure.query(async ({ ctx }) => {
      return prisma.userSession.findMany({
        where: { userId: ctx.user.id },
        orderBy: { lastSeenAt: 'desc' },
        select: {
          id: true,
          deviceLabel: true,
          ipHash: true,
          userAgentSummary: true,
          createdAt: true,
          lastSeenAt: true,
          expiresAt: true,
          revokedAt: true,
        },
      })
    }),

    revokeSession: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await prisma.userSession.update({
          where: { id: input.id, userId: ctx.user.id },
          data: { revokedAt: new Date() },
        })
        return { success: true }
      }),

    revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
      await prisma.userSession.updateMany({
        where: { userId: ctx.user.id },
        data: { revokedAt: new Date() },
      })
      return { success: true }
    }),

    exportData: protectedProcedure
      .input(z.object({ format: z.enum(['JSON', 'CSV']) }))
      .mutation(async ({ ctx, input }) => {
        const exportJob = await prisma.dataExportJob.create({
          data: {
            userId: ctx.user.id,
            format: input.format,
            status: 'QUEUED',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })

        await logActivity(ctx.user.id, 'IMPORT_STARTED', `Data export requested: ${input.format}`, exportJob.id, 'export')
        return exportJob
      }),

    getExportJobs: protectedProcedure.query(async ({ ctx }) => {
      return prisma.dataExportJob.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          format: true,
          storageObjectKey: true,
          expiresAt: true,
          createdAt: true,
          completedAt: true,
        },
      })
    }),

    deleteAccount: protectedProcedure
      .input(z.object({ confirmation: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (input.confirmation !== 'DELETE_MY_ACCOUNT') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Please confirm account deletion' })
        }

        await prisma.$transaction(async (tx) => {
          await tx.userSettings.delete({ where: { userId: ctx.user.id } })
          await tx.notificationSettings.delete({ where: { userId: ctx.user.id } })
          await tx.dataExportJob.deleteMany({ where: { userId: ctx.user.id } })
          await tx.userSession.updateMany({
            where: { userId: ctx.user.id },
            data: { revokedAt: new Date() },
          })
          await prisma.user.delete({ where: { id: ctx.user.id } })
        })

        return { success: true }
      }),
  }),

  // ============================================
  // PROFILE (extended)
  // ============================================
  profile: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
      return prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          accounts: { select: { provider: true, providerAccountId: true } },
        },
      })
    }),

    update: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100).optional(),
        image: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const data: any = {}
        if (input.name !== undefined) data.name = input.name
        if (input.image !== undefined) data.image = input.image

        return prisma.user.update({
          where: { id: ctx.user.id },
          data,
        })
      }),
  }),

  // ============================================
  // PRACTICE
  // ============================================
  practice: practiceRouter,
})

export type AppRouter = typeof appRouter

// Helper functions
async function calculateStreak(userId: string): Promise<number> {
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

async function getSubjectsWithStats(userId: string) {
  const subjects = await prisma.subject.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    include: {
      _count: { select: { questions: true } },
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
      questionCount: s._count.questions,
      accuracy,
      masteredCount,
    }
  })
}

async function updateReviewItem(userId: string, questionId: string, isCorrect: boolean, existingItem: any) {
  await prisma.$transaction(async (tx) => {
    await updateReviewItemTx(tx, userId, questionId, isCorrect, existingItem)
  })
}

async function updateReviewItemTx(tx: any, userId: string, questionId: string, isCorrect: boolean, existingItem: any) {
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
    // Incorrect - reset
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

  // Log mastery achievement
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

async function logActivity(
  userId: string,
  type: string,
  title: string,
  entityId?: string,
  entityType?: string,
  metadata?: any
) {
  await prisma.activityEvent.create({
    data: { userId, type: type as any, title, entityId, entityType, metadata },
  })
}

async function getUserTimezone(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } })
  return settings?.timezone ?? 'UTC'
}
