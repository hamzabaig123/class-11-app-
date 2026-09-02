import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import { practiceRouter } from './practice'
import { importsRouter } from './imports'
import { subjectsRouter, chaptersRouter } from './subjects'
import { sourcesRouter } from './sources'
import { logActivity, getUserTimezone, calculateStreak, getSubjectsWithStats } from './helpers'

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: 'ok' })),

  navigation: createTRPCRouter({
    tree: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id
      const subjects = await prisma.subject.findMany({
        where: { userId, status: 'ACTIVE' },
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { questions: { where: { status: 'ACTIVE' } }, chapters: { where: { status: 'ACTIVE' } } } },
          chapters: { where: { status: 'ACTIVE' }, orderBy: { position: 'asc' }, include: { _count: { select: { questions: { where: { status: 'ACTIVE' } } } } } },
        },
      })
      const [dueCount, streak] = await Promise.all([
        prisma.reviewItem.count({ where: { userId, nextReviewAt: { lte: new Date() }, status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] } } }),
        calculateStreak(userId),
      ])
      return {
        subjects: subjects.map(s => ({
          id: s.id, name: s.name, icon: s.icon, color: s.color,
          questionCount: s._count.questions, chapterCount: s._count.chapters,
          chapters: s.chapters.map(c => ({ id: c.id, name: c.name, chapterNo: c.chapterNo, position: c.position, questionCount: c._count.questions })),
        })),
        dueReviewCount: dueCount, streak,
      }
    }),
  }),

  dashboard: createTRPCRouter({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id
      const timezone = await getUserTimezone(userId)
      const now = new Date()
      const startOfDay = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(startOfDay); endOfDay.setHours(23, 59, 59, 999)
      const [questionCount, masteredCount, attemptsAgg, todayAttempts, todayCorrect, todayStudy, dueToday, streak, studyTime, unfinished, subjects, activity, settings] = await Promise.all([
        prisma.question.count({ where: { userId, status: 'ACTIVE' } }),
        prisma.reviewItem.count({ where: { userId, status: 'MASTERED' } }),
        prisma.attempt.groupBy({ by: ['isCorrect'], where: { userId }, _count: true }),
        prisma.attempt.count({ where: { userId, createdAt: { gte: startOfDay, lte: endOfDay } } }),
        prisma.attempt.count({ where: { userId, isCorrect: true, createdAt: { gte: startOfDay, lte: endOfDay } } }),
        prisma.practiceSession.aggregate({ where: { userId, status: 'COMPLETED', completedAt: { gte: startOfDay, lte: endOfDay } }, _sum: { totalTimeMs: true } }).then(r => Math.floor((r._sum.totalTimeMs ?? 0) / 1000)),
        prisma.reviewItem.count({ where: { userId, nextReviewAt: { gte: startOfDay, lte: endOfDay }, status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] } } }),
        calculateStreak(userId),
        prisma.practiceSession.aggregate({ where: { userId, status: 'COMPLETED' }, _sum: { totalTimeMs: true } }),
        prisma.practiceSession.findFirst({ where: { userId, status: 'IN_PROGRESS' }, orderBy: { startedAt: 'desc' }, select: { id: true, currentIndex: true, questionCount: true, title: true } }),
        getSubjectsWithStats(userId),
        prisma.activityEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, type: true, title: true, createdAt: true, entityId: true } }),
        prisma.userSettings.findUnique({ where: { userId }, select: { dailyQuestionGoal: true, dailyMinuteGoal: true, timezone: true, masteryThreshold: true } }),
      ])
      const totalAttempts = attemptsAgg.reduce((s, a) => s + a._count, 0)
      const correctAttempts = attemptsAgg.find(a => a.isCorrect)?._count ?? 0
      const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : null
      return {
        user: { displayName: ctx.user.name ?? 'User', initials: ctx.user.name ? ctx.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U' },
        questionCount, masteredCount, accuracy, attemptedCount: totalAttempts, dueTodayCount: dueToday,
        studyStreakDays: streak,
        studyTimeSeconds: Math.floor((studyTime._sum.totalTimeMs ?? 0) / 1000),
        unfinishedSession: unfinished ? { id: unfinished.id, currentIndex: unfinished.currentIndex, totalQuestions: unfinished.questionCount, title: unfinished.title ?? 'Practice Session' } : null,
        subjects, recentActivity: activity.map(a => ({ ...a, occurredAt: a.createdAt.toISOString() })),
        onboardingComplete: !!settings,
        today: { attemptedCount: todayAttempts, correctCount: todayCorrect, studySeconds: todayStudy, accuracy: todayAttempts > 0 ? Math.round((todayCorrect / todayAttempts) * 100) : null },
        settings: settings ? { dailyQuestionGoal: settings.dailyQuestionGoal, dailyMinuteGoal: settings.dailyMinuteGoal, timezone: settings.timezone, masteryThreshold: settings.masteryThreshold } : { dailyQuestionGoal: null, dailyMinuteGoal: null, timezone: null, masteryThreshold: null },
      }
    }),
  }),

  subjects: subjectsRouter,
  chapters: chaptersRouter,
  sources: sourcesRouter,

  topics: createTRPCRouter({
    list: protectedProcedure.input(z.object({ subjectId: z.string() })).query(async ({ ctx, input }) => {
      return prisma.topic.findMany({ where: { subjectId: input.subjectId, userId: ctx.user.id }, orderBy: { position: 'asc' } })
    }),
  }),

  questions: createTRPCRouter({
    list: protectedProcedure.input(z.object({
      subjectId: z.string().optional(), topicId: z.string().optional(), chapterId: z.string().optional(), sourceId: z.string().optional(),
      status: z.enum(['ACTIVE', 'ARCHIVED', 'FLAGGED', 'DRAFT']).optional(), difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      year: z.number().int().min(1900).max(2100).optional(), search: z.string().optional(),
      sort: z.enum(['createdAt_desc', 'createdAt_asc', 'updatedAt_desc', 'updatedAt_asc', 'difficulty_asc', 'difficulty_desc']).default('updatedAt_desc'),
      limit: z.number().default(50), cursor: z.string().optional(), bookmarked: z.boolean().optional(), hasExplanation: z.boolean().optional(),
    })).query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.user.id }
      if (input.subjectId) where.subjectId = input.subjectId
      if (input.topicId) where.topicId = input.topicId
      if (input.chapterId) where.chapterId = input.chapterId
      if (input.status) where.status = input.status
      if (input.difficulty) where.difficulty = input.difficulty
      if (input.year) where.year = input.year
      if (input.sourceId) where.questionSources = { some: { sourceId: input.sourceId } }
      if (input.bookmarked) where.bookmarks = { some: { userId: ctx.user.id } }
      if (input.hasExplanation) where.explanation = { not: null }
      if (input.search) where.OR = [{ text: { contains: input.search } }, { explanation: { contains: input.search } }, { source: { contains: input.search } }, { tags: { some: { name: { contains: input.search } } } }]
      const [sortField, sortOrder] = input.sort.split('_')
      const questions = await prisma.question.findMany({
        where, orderBy: { [sortField]: sortOrder }, take: input.limit + 1, cursor: input.cursor ? { id: input.cursor } : undefined,
        include: { options: { orderBy: { position: 'asc' } }, tags: true, subject: { select: { id: true, name: true, color: true } }, topic: { select: { id: true, name: true } }, chapter: { select: { id: true, name: true } }, _count: { select: { attempts: true } } },
      })
      let nextCursor: string | undefined
      if (questions.length > input.limit) { const next = questions.pop(); nextCursor = next!.id }
      return { questions, nextCursor, total: questions.length }
    }),

    count: protectedProcedure.input(z.object({
      subjectId: z.string().optional(), topicId: z.string().optional(), chapterId: z.string().optional(),
      status: z.enum(['ACTIVE', 'ARCHIVED', 'FLAGGED', 'DRAFT']).optional(), difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      year: z.number().int().min(1900).max(2100).optional(), search: z.string().optional(),
    })).query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.user.id }
      if (input.subjectId) where.subjectId = input.subjectId
      if (input.topicId) where.topicId = input.topicId
      if (input.chapterId) where.chapterId = input.chapterId
      if (input.status) where.status = input.status
      if (input.difficulty) where.difficulty = input.difficulty
      if (input.year) where.year = input.year
      if (input.search) where.OR = [{ text: { contains: input.search } }, { explanation: { contains: input.search } }, { source: { contains: input.search } }, { tags: { some: { name: { contains: input.search } } } }]
      const [total, active, archived, flagged, draft] = await Promise.all([
        prisma.question.count({ where }), prisma.question.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.question.count({ where: { ...where, status: 'ARCHIVED' } }), prisma.question.count({ where: { ...where, status: 'FLAGGED' } }),
        prisma.question.count({ where: { ...where, status: 'DRAFT' } }),
      ])
      return { total, active, archived, flagged, draft }
    }),

    get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const question = await prisma.question.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { options: { orderBy: { position: 'asc' } }, answer: true, tags: true, subject: true, topic: true, chapter: { select: { id: true, name: true } }, reviewItems: { take: 1 }, _count: { select: { attempts: true } }, questionSources: { include: { source: { select: { id: true, title: true, sourceType: true, author: true, year: true } } }, orderBy: { isPrimary: 'desc' } }, bookmarks: { where: { userId: ctx.user.id }, select: { id: true } } },
      })
      if (!question) return null
      return { ...question, reviewItem: question.reviewItems[0] || null, attemptsCount: question._count?.attempts ?? 0, isBookmarked: question.bookmarks.length > 0, sources: question.questionSources.map(qs => ({ ...qs.source, pageNumber: qs.pageNumber, section: qs.section, quote: qs.quote, isPrimary: qs.isPrimary })) }
    }),

    create: protectedProcedure.input(z.object({
      text: z.string().min(1).max(5000), options: z.array(z.object({ label: z.enum(['A', 'B', 'C', 'D']), text: z.string().min(1).max(1000) })).length(4),
      correctLabel: z.enum(['A', 'B', 'C', 'D']), explanation: z.string().max(5000).optional(), hint: z.string().max(1000).optional(),
      source: z.string().max(200).optional(), year: z.number().int().min(1900).max(2100).optional(), difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
      subjectId: z.string().optional(), topicId: z.string().optional(), chapterId: z.string().optional(), tags: z.array(z.string().max(50)).max(10).optional(), status: z.enum(['ACTIVE', 'DRAFT']).default('DRAFT'),
    })).mutation(async ({ ctx, input }) => {
      const { options, tags, ...questionData } = input
      if (input.chapterId) { const ch = await prisma.chapter.findFirst({ where: { id: input.chapterId, userId: ctx.user.id } }); if (!ch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' }); if (input.subjectId && ch.subjectId !== input.subjectId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Chapter does not belong to subject' }) }
      if (input.subjectId) { const s = await prisma.subject.findFirst({ where: { id: input.subjectId, userId: ctx.user.id } }); if (!s) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' }) }
      const question = await prisma.question.create({ data: { ...questionData, userId: ctx.user.id, options: { create: options.map((o, i) => ({ ...o, position: i })) }, answer: { create: { correctLabel: input.correctLabel, explanation: input.explanation } }, tags: tags?.length ? { create: tags.map(n => ({ name: n, color: null })) } : undefined }, include: { options: true, answer: true, tags: true } })
      await prisma.reviewItem.create({ data: { questionId: question.id, userId: ctx.user.id, status: 'NEW', nextReviewAt: new Date() } })
      await logActivity(ctx.user.id, 'QUESTION_CREATED', 'Created question', question.id, 'question')
      return question
    }),

    update: protectedProcedure.input(z.object({
      id: z.string(), text: z.string().min(1).max(5000).optional(), explanation: z.string().max(5000).optional(), hint: z.string().max(1000).optional(),
      source: z.string().max(200).optional(), year: z.number().int().min(1900).max(2100).optional(), difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      subjectId: z.string().nullable().optional(), topicId: z.string().nullable().optional(), chapterId: z.string().nullable().optional(),
      status: z.enum(['ACTIVE', 'ARCHIVED', 'FLAGGED', 'DRAFT']).optional(), tags: z.array(z.string().max(50)).max(10).optional(), changeNote: z.string().max(200).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, tags, changeNote, ...data } = input
      const existing = await prisma.question.findFirst({ where: { id, userId: ctx.user.id }, include: { answer: true, options: true } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (data.chapterId) { const ch = await prisma.chapter.findFirst({ where: { id: data.chapterId, userId: ctx.user.id } }); if (!ch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' }); if (data.subjectId && ch.subjectId !== data.subjectId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Chapter does not belong to subject' }) }
      await prisma.questionRevision.create({ data: { questionId: id, userId: ctx.user.id, version: existing.version, snapshot: JSON.stringify({ text: existing.text, explanation: existing.explanation, hint: existing.hint, source: existing.source, year: existing.year, difficulty: existing.difficulty, subjectId: existing.subjectId, topicId: existing.topicId, chapterId: existing.chapterId, status: existing.status, options: existing.options.map(o => ({ label: o.label, text: o.text })), answer: existing.answer ? { correctLabel: existing.answer.correctLabel, explanation: existing.answer.explanation } : null }), changeNote: changeNote || null } })
      if (tags !== undefined) { await prisma.questionTag.deleteMany({ where: { questionId: id } }); if (tags.length > 0) await prisma.questionTag.createMany({ data: tags.map(n => ({ questionId: id, name: n, color: null })) }) }
      const question = await prisma.question.update({ where: { id, userId: ctx.user.id }, data: { ...data, version: { increment: 1 } }, include: { options: true, answer: true, tags: true } })
      await logActivity(ctx.user.id, 'QUESTION_UPDATED', 'Updated question', question.id, 'question')
      return question
    }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const q = await prisma.question.findFirst({ where: { id: input.id, userId: ctx.user.id } }); if (!q) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      await prisma.question.delete({ where: { id: input.id, userId: ctx.user.id } }); await logActivity(ctx.user.id, 'QUESTION_DELETED', 'Deleted question', input.id, 'question'); return { success: true }
    }),

    archive: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const q = await prisma.question.findFirst({ where: { id: input.id, userId: ctx.user.id } }); if (!q) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      return prisma.question.update({ where: { id: input.id, userId: ctx.user.id }, data: { status: 'ARCHIVED' } })
    }),

    restore: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const q = await prisma.question.findFirst({ where: { id: input.id, userId: ctx.user.id } }); if (!q) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      return prisma.question.update({ where: { id: input.id, userId: ctx.user.id }, data: { status: 'ACTIVE' } })
    }),

    bulkUpdate: protectedProcedure.input(z.object({
      questionIds: z.array(z.string()).min(1).max(100), action: z.enum(['archive', 'restore', 'delete', 'changeSubject', 'changeChapter', 'changeDifficulty', 'publish']),
      subjectId: z.string().nullable().optional(), chapterId: z.string().nullable().optional(), difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    })).mutation(async ({ ctx, input }) => {
      const results = await prisma.$transaction(async (tx) => {
        const items: any[] = []
        for (const qid of input.questionIds) {
          try {
            switch (input.action) {
              case 'archive': await tx.question.update({ where: { id: qid, userId: ctx.user.id }, data: { status: 'ARCHIVED' } }); break
              case 'restore': case 'publish': await tx.question.update({ where: { id: qid, userId: ctx.user.id }, data: { status: 'ACTIVE' } }); break
              case 'delete': await tx.question.delete({ where: { id: qid, userId: ctx.user.id } }); break
              case 'changeSubject': await tx.question.update({ where: { id: qid, userId: ctx.user.id }, data: { subjectId: input.subjectId } }); break
              case 'changeChapter': await tx.question.update({ where: { id: qid, userId: ctx.user.id }, data: { chapterId: input.chapterId } }); break
              case 'changeDifficulty': await tx.question.update({ where: { id: qid, userId: ctx.user.id }, data: { difficulty: input.difficulty } }); break
            }
            items.push({ questionId: qid, success: true })
          } catch (e) { items.push({ questionId: qid, success: false, error: 'Failed' }) }
        }
        return items
      })
      await logActivity(ctx.user.id, 'QUESTIONS_BULK_UPDATED', `Bulk ${input.action} on ${input.questionIds.length} questions`, undefined, 'question')
      return { results }
    }),

    duplicate: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const original = await prisma.question.findFirst({ where: { id: input.id, userId: ctx.user.id }, include: { options: true, answer: true, tags: true } })
      if (!original) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      const dup = await prisma.question.create({ data: { text: original.text + ' (Copy)', explanation: original.explanation, hint: original.hint, source: original.source, year: original.year, difficulty: original.difficulty, subjectId: original.subjectId, topicId: original.topicId, chapterId: original.chapterId, userId: ctx.user.id, status: 'DRAFT', options: { create: original.options.map((o, i) => ({ label: o.label, text: o.text, position: i })) }, answer: original.answer ? { create: { correctLabel: original.answer.correctLabel, explanation: original.answer.explanation } } : undefined, tags: original.tags.length ? { create: original.tags.map(t => ({ name: t.name, color: t.color })) } : undefined }, include: { options: true, answer: true, tags: true } })
      await prisma.reviewItem.create({ data: { questionId: dup.id, userId: ctx.user.id, status: 'NEW', nextReviewAt: new Date() } })
      await logActivity(ctx.user.id, 'QUESTION_CREATED', 'Duplicated question', dup.id, 'question')
      return dup
    }),

    revisions: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const revs = await prisma.questionRevision.findMany({ where: { questionId: input.id, userId: ctx.user.id }, orderBy: { version: 'desc' } })
      return revs.map(r => ({ ...r, snapshot: JSON.parse(r.snapshot) }))
    }),

    toggleBookmark: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const existing = await prisma.questionBookmark.findUnique({ where: { userId_questionId: { userId: ctx.user.id, questionId: input.id } } })
      if (existing) { await prisma.questionBookmark.delete({ where: { id: existing.id } }); return { bookmarked: false } }
      else { await prisma.questionBookmark.create({ data: { userId: ctx.user.id, questionId: input.id } }); return { bookmarked: true } }
    }),
  }),

  attempts: createTRPCRouter({
    submit: protectedProcedure.input(z.object({ questionId: z.string(), selectedLabel: z.enum(['A', 'B', 'C', 'D']), timeSpentMs: z.number().int().positive().optional(), sessionId: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const question = await prisma.question.findFirst({ where: { id: input.questionId, userId: ctx.user.id }, include: { answer: true, reviewItems: { take: 1 } } })
      if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (!question.answer) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Question has no answer key' })
      const isCorrect = input.selectedLabel === question.answer.correctLabel
      const attempt = await prisma.attempt.create({ data: { questionId: input.questionId, userId: ctx.user.id, selectedLabel: input.selectedLabel, isCorrect, timeSpentMs: input.timeSpentMs, sessionId: input.sessionId } })
      await logActivity(ctx.user.id, 'QUESTION_ANSWERED', `Answered "${question.text.slice(0, 50)}..." ${isCorrect ? 'correctly' : 'incorrectly'}`, question.id, 'question', { isCorrect, selectedLabel: input.selectedLabel })
      return { attempt, isCorrect, correctLabel: question.answer.correctLabel, explanation: question.answer.explanation }
    }),
  }),

  revision: createTRPCRouter({
    dueQueue: protectedProcedure.query(async ({ ctx }) => {
      const now = new Date()
      const items = await prisma.reviewItem.findMany({ where: { userId: ctx.user.id, status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] }, nextReviewAt: { lte: now } }, include: { question: { include: { options: { orderBy: { position: 'asc' } }, answer: true, subject: { select: { id: true, name: true, color: true } }, topic: { select: { id: true, name: true } }, chapter: { select: { id: true, name: true } } } } }, orderBy: { nextReviewAt: 'asc' } })
      return items.map(item => ({ ...item, question: item.question }))
    }),
    startSession: protectedProcedure.input(z.object({ questionIds: z.array(z.string()), title: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.create({ data: { userId: ctx.user.id, title: input.title, questionCount: input.questionIds.length } })
      await logActivity(ctx.user.id, 'SESSION_STARTED', 'Started session', session.id, 'session'); return session
    }),
    submitAnswer: protectedProcedure.input(z.object({ sessionId: z.string(), questionId: z.string(), selectedLabel: z.enum(['A', 'B', 'C', 'D']) })).mutation(async ({ ctx, input }) => {
      const question = await prisma.question.findFirst({ where: { id: input.questionId, userId: ctx.user.id }, include: { answer: true } })
      if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (!question.answer) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Question has no answer key' })
      const isCorrect = input.selectedLabel === question.answer.correctLabel
      const attempt = await prisma.attempt.create({ data: { questionId: input.questionId, userId: ctx.user.id, selectedLabel: input.selectedLabel, isCorrect, sessionId: input.sessionId } })
      return { attempt, isCorrect, correctLabel: question.answer.correctLabel, explanation: question.answer.explanation }
    }),
    completeSession: protectedProcedure.input(z.object({ sessionId: z.string() })).mutation(async ({ ctx, input }) => {
      const session = await prisma.practiceSession.update({ where: { id: input.sessionId, userId: ctx.user.id }, data: { status: 'COMPLETED', completedAt: new Date() } })
      await logActivity(ctx.user.id, 'SESSION_COMPLETED', 'Completed session', session.id, 'session'); return session
    }),
  }),

  imports: importsRouter,

  collections: createTRPCRouter({
    list: protectedProcedure.input(z.object({ query: z.string().optional(), subjectId: z.string().optional(), sort: z.enum(['recent', 'name', 'questionCount', 'accuracy', 'lastPracticed']).default('recent'), page: z.number().default(1), pageSize: z.number().default(20) })).query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.user.id, status: 'ACTIVE' }
      if (input.query) where.OR = [{ name: { contains: input.query, mode: 'insensitive' } }, { description: { contains: input.query, mode: 'insensitive' } }]
      if (input.subjectId) where.defaultSubjectId = input.subjectId
      const orderBy: any = {}; switch (input.sort) { case 'name': orderBy.name = 'asc'; break; default: orderBy.updatedAt = 'desc' }
      const [collections, total] = await Promise.all([prisma.collection.findMany({ where, orderBy, skip: (input.page - 1) * input.pageSize, take: input.pageSize, include: { _count: { select: { questions: true } }, questions: { where: { question: { status: 'ACTIVE' } }, select: { questionId: true } } } }), prisma.collection.count({ where })])
      const cards = await Promise.all(collections.map(async (c) => {
        const qids = c.questions.map(q => q.questionId); let accuracy = null; let attempted = 0
        if (qids.length > 0) { const atts = await prisma.attempt.findMany({ where: { questionId: { in: qids }, userId: ctx.user.id }, select: { isCorrect: true } }); attempted = atts.length; const correct = atts.filter(a => a.isCorrect).length; accuracy = attempted > 0 ? (correct / attempted) * 100 : null }
        return { id: c.id, name: c.name, description: c.description, color: c.color, icon: c.icon, isPinned: c.isPinned, questionCount: c._count.questions, attemptedCount: attempted, accuracy, createdAt: c.createdAt }
      }))
      return { collections: cards, total, page: input.page, pageSize: input.pageSize }
    }),

    get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const collection = await prisma.collection.findFirst({ where: { id: input.id, userId: ctx.user.id }, include: { _count: { select: { questions: true } }, questions: { include: { question: { include: { subject: true, topic: true, answer: true, _count: { select: { attempts: true } } } } }, orderBy: { sortOrder: 'asc' } } } })
      if (!collection) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })
      const qids = collection.questions.map(q => q.questionId); let accuracy = null; let attempted = 0; let mastered = 0
      if (qids.length > 0) { const atts = await prisma.attempt.findMany({ where: { questionId: { in: qids }, userId: ctx.user.id }, select: { isCorrect: true, questionId: true } }); attempted = atts.length; const correct = atts.filter(a => a.isCorrect).length; accuracy = attempted > 0 ? (correct / attempted) * 100 : null; const ri = await prisma.reviewItem.findMany({ where: { userId: ctx.user.id, questionId: { in: qids } }, select: { questionId: true, status: true } }); mastered = ri.filter(r => r.status === 'MASTERED').length }
      return { ...collection, questions: collection.questions.map(q => ({ ...q, question: q.question })), accuracy, attemptedCount: attempted, masteredCount: mastered }
    }),

    create: protectedProcedure.input(z.object({ name: z.string().min(1).max(100), description: z.string().max(500).optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), icon: z.string().optional(), defaultSubjectId: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const c = await prisma.collection.create({ data: { ...input, userId: ctx.user.id } }); await logActivity(ctx.user.id, 'COLLECTION_CREATED', `Created collection "${c.name}"`, c.id, 'collection'); return c
    }),
    update: protectedProcedure.input(z.object({ id: z.string(), name: z.string().min(1).max(100).optional(), description: z.string().max(500).optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), icon: z.string().optional(), defaultSubjectId: z.string().optional() })).mutation(async ({ ctx, input }) => { const { id, ...data } = input; return prisma.collection.update({ where: { id, userId: ctx.user.id }, data }) }),
    archive: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => prisma.collection.update({ where: { id: input.id, userId: ctx.user.id }, data: { status: 'ARCHIVED', archivedAt: new Date() } })),
    restore: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => prisma.collection.update({ where: { id: input.id, userId: ctx.user.id }, data: { status: 'ACTIVE', archivedAt: null } })),
    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => { await prisma.$transaction(async (tx) => { await tx.collectionQuestion.deleteMany({ where: { collectionId: input.id } }); await tx.collectionActivity.deleteMany({ where: { collectionId: input.id } }); await prisma.collection.delete({ where: { id: input.id, userId: ctx.user.id } }) }); return { success: true } }),
    addQuestions: protectedProcedure.input(z.object({ collectionId: z.string(), questionIds: z.array(z.string()).min(1).max(200) })).mutation(async ({ ctx, input }) => {
      const col = await prisma.collection.findFirst({ where: { id: input.collectionId, userId: ctx.user.id } }); if (!col) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })
      const results = await prisma.$transaction(async (tx) => {
        const max = await tx.collectionQuestion.aggregate({ where: { collectionId: input.collectionId }, _max: { sortOrder: true } }); const base = (max._max.sortOrder ?? 0) + 1
        const inserted: string[] = []; const skipped: any[] = []
        for (let i = 0; i < input.questionIds.length; i++) { const qid = input.questionIds[i]; const q = await tx.question.findFirst({ where: { id: qid, userId: ctx.user.id } }); if (!q) { skipped.push({ questionId: qid, reason: 'Not found' }); continue } const ex = await tx.collectionQuestion.findUnique({ where: { collectionId_questionId: { collectionId: input.collectionId, questionId: qid } } }); if (ex) { skipped.push({ questionId: qid, reason: 'Already in collection' }); continue } await tx.collectionQuestion.create({ data: { collectionId: input.collectionId, questionId: qid, sortOrder: base + i } }); inserted.push(qid) }
        await prisma.collection.update({ where: { id: input.collectionId }, data: { updatedAt: new Date() } }); return { inserted, skipped }
      }); return results
    }),
    removeQuestion: protectedProcedure.input(z.object({ collectionId: z.string(), questionId: z.string() })).mutation(async ({ ctx, input }) => { await prisma.collectionQuestion.deleteMany({ where: { collectionId: input.collectionId, questionId: input.questionId } }); await prisma.collection.update({ where: { id: input.collectionId }, data: { updatedAt: new Date() } }); return { success: true } }),
    startPractice: protectedProcedure.input(z.object({ collectionId: z.string(), count: z.number().int().min(1).max(100).optional(), mode: z.enum(['PRACTICE', 'REVISION', 'QUIZ', 'EXAM']).optional() })).mutation(async ({ ctx, input }) => {
      const { collectionId, count = 10, mode = 'PRACTICE' } = input; const col = await prisma.collection.findFirst({ where: { id: collectionId, userId: ctx.user.id }, include: { questions: { where: { question: { status: 'ACTIVE' } } } } }); if (!col) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })
      const qids = col.questions.map(q => q.questionId).sort(() => Math.random() - 0.5).slice(0, count); if (qids.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active questions' })
      const session = await prisma.practiceSession.create({ data: { userId: ctx.user.id, title: `Collection: ${col.name}`, type: mode, questionCount: qids.length } })
      await prisma.practiceSessionQuestion.createMany({ data: qids.map((qid, i) => ({ sessionId: session.id, questionId: qid, position: i })) }); await logActivity(ctx.user.id, 'SESSION_STARTED', 'Started collection practice', session.id, 'session'); return { sessionId: session.id, title: session.title, questionCount: qids.length }
    }),
    togglePinned: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => { const c = await prisma.collection.findFirst({ where: { id: input.id, userId: ctx.user.id } }); if (!c) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' }); return prisma.collection.update({ where: { id: input.id, userId: ctx.user.id }, data: { isPinned: !c.isPinned } }) }),
    duplicate: protectedProcedure.input(z.object({ id: z.string(), newName: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const col = await prisma.collection.findFirst({ where: { id: input.id, userId: ctx.user.id }, include: { questions: true } }); if (!col) throw new TRPCError({ code: 'NOT_FOUND', message: 'Collection not found' })
      const newName = input.newName ?? `${col.name} (Copy)`; const nc = await prisma.collection.create({ data: { userId: ctx.user.id, name: newName, description: col.description, color: col.color, icon: col.icon, defaultSubjectId: col.defaultSubjectId } })
      if (col.questions.length > 0) await prisma.collectionQuestion.createMany({ data: col.questions.map((q, i) => ({ collectionId: nc.id, questionId: q.questionId, sortOrder: i })) }); await logActivity(ctx.user.id, 'COLLECTION_CREATED', 'Duplicated collection', nc.id, 'collection'); return nc
    }),
  }),

  notes: createTRPCRouter({
    list: protectedProcedure.input(z.object({ query: z.string().optional(), categoryId: z.string().optional(), subjectId: z.string().optional(), sort: z.enum(['updatedAt_desc', 'createdAt_desc', 'title_asc', 'pinned_first']).default('updatedAt_desc'), page: z.number().default(1), pageSize: z.number().default(20) })).query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.user.id }; if (input.query) where.OR = [{ title: { contains: input.query, mode: 'insensitive' } }, { body: { contains: input.query, mode: 'insensitive' } }]; if (input.categoryId) where.categoryId = input.categoryId; if (input.subjectId) where.subjectId = input.subjectId
      const orderBy: any = {}; const [sf, so] = input.sort.split('_'); if (sf === 'pinned') { orderBy.isPinned = 'desc'; orderBy.updatedAt = 'desc' } else orderBy[sf] = so
      const [notes, total] = await Promise.all([prisma.note.findMany({ where, orderBy, skip: (input.page - 1) * input.pageSize, take: input.pageSize, include: { subject: { select: { id: true, name: true, color: true } }, category: { select: { id: true, name: true, color: true } }, _count: { select: { questions: true } } } }), prisma.note.count({ where })]); return { notes, total, page: input.page, pageSize: input.pageSize }
    }),
    get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => { const note = await prisma.note.findFirst({ where: { id: input.id, userId: ctx.user.id }, include: { subject: { select: { id: true, name: true, color: true } }, topic: { select: { id: true, name: true } }, category: { select: { id: true, name: true, color: true } }, questions: { include: { question: { include: { subject: true, topic: true, _count: { select: { attempts: true } } } } } } } }); if (!note) return null; return { ...note, linkedQuestions: note.questions.map(nq => nq.question) } }),
    create: protectedProcedure.input(z.object({ title: z.string().min(1).max(200), body: z.string().max(100000), bodyFormat: z.enum(['MARKDOWN', 'STRUCTURED_TEXT']).optional(), subjectId: z.string().optional(), topicId: z.string().optional(), categoryId: z.string().optional() })).mutation(async ({ ctx, input }) => { const n = await prisma.note.create({ data: { ...input, userId: ctx.user.id, bodyFormat: input.bodyFormat ?? 'MARKDOWN', status: 'ACTIVE', version: 1 } }); await logActivity(ctx.user.id, 'NOTE_CREATED', `Created note "${n.title}"`, n.id, 'note'); return n }),
    update: protectedProcedure.input(z.object({ id: z.string(), title: z.string().min(1).max(200).optional(), body: z.string().max(100000).optional(), bodyFormat: z.enum(['MARKDOWN', 'STRUCTURED_TEXT']).optional(), subjectId: z.string().nullable().optional(), topicId: z.string().nullable().optional(), categoryId: z.string().nullable().optional(), version: z.number().int().min(1).optional() })).mutation(async ({ ctx, input }) => { const { id, ...data } = input; if (data.version) { const ex = await prisma.note.findFirst({ where: { id, userId: ctx.user.id } }); if (ex && ex.version !== data.version) await prisma.noteRevision.create({ data: { noteId: id, userId: ctx.user.id, version: ex.version, title: ex.title, body: ex.body } }) } return prisma.note.update({ where: { id, userId: ctx.user.id }, data: { ...data, updatedAt: new Date(), version: { increment: 1 } } }) }),
    archive: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => prisma.note.update({ where: { id: input.id, userId: ctx.user.id }, data: { status: 'ARCHIVED', archivedAt: new Date() } })),
    restore: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => prisma.note.update({ where: { id: input.id, userId: ctx.user.id }, data: { status: 'ACTIVE', archivedAt: null } })),
    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => { await prisma.note.delete({ where: { id: input.id, userId: ctx.user.id } }); return { success: true } }),
    autosave: protectedProcedure.input(z.object({ id: z.string().optional(), title: z.string().min(1).max(200), body: z.string().max(100000), bodyFormat: z.enum(['MARKDOWN', 'STRUCTURED_TEXT']).optional(), subjectId: z.string().optional(), topicId: z.string().optional(), categoryId: z.string().optional() })).mutation(async ({ ctx, input }) => { if (input.id) return prisma.note.update({ where: { id: input.id, userId: ctx.user.id }, data: { title: input.title, body: input.body, bodyFormat: input.bodyFormat ?? 'MARKDOWN', subjectId: input.subjectId, topicId: input.topicId, categoryId: input.categoryId, updatedAt: new Date(), lastSavedAt: new Date() } }); return prisma.note.create({ data: { ...input, userId: ctx.user.id, status: 'DRAFT', version: 1, bodyFormat: input.bodyFormat ?? 'MARKDOWN' } }) }),
    togglePinned: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => { const n = await prisma.note.findFirst({ where: { id: input.id, userId: ctx.user.id } }); if (!n) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' }); return prisma.note.update({ where: { id: input.id, userId: ctx.user.id }, data: { isPinned: !n.isPinned } }) }),
  }),

  analytics: createTRPCRouter({
    summary: protectedProcedure.input(z.object({ from: z.string().optional(), to: z.string().optional(), timezone: z.string().optional() })).query(async ({ ctx, input }) => {
      const uid = ctx.user.id; const tz = input.timezone ?? await getUserTimezone(uid); const now = new Date(); const to = new Date(); to.setHours(0, 0, 0, 0); const from = new Date(to); from.setDate(from.getDate() - 30)
      const [qc, aa, tt, st, streak, due] = await Promise.all([prisma.question.count({ where: { uid, status: 'ACTIVE' } }), prisma.attempt.count({ where: { uid, createdAt: { gte: from, lte: to } } }), prisma.attempt.groupBy({ by: ['isCorrect'], where: { uid, createdAt: { gte: from, lte: to } }, _count: true }), prisma.practiceSession.aggregate({ where: { uid, status: 'COMPLETED' }, _sum: { totalTimeMs: true } }), calculateStreak(uid), prisma.reviewItem.count({ where: { uid, nextReviewAt: { lte: to }, status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] } } })])
      const total = aa; const correct = tt.find((a: any) => a.isCorrect)?._count ?? 0; const accuracy = total > 0 ? (correct / total) * 100 : null
      return { questionCount: qc, attemptedCount: total, totalAttempts: total, correctAttempts: correct, accuracy, studyTimeSeconds: Math.floor((st._sum?.totalTimeMs ?? 0) / 1000), studyStreakDays: streak, dueTodayCount: due, previousPeriod: { questionCount: qc, attemptedCount: total, accuracy } }
    }),
    accuracyTrend: protectedProcedure.input(z.object({ from: z.string(), to: z.string(), bucket: z.enum(['daily', 'weekly']).optional(), timezone: z.string().optional() })).query(async ({ ctx, input }) => {
      const uid = ctx.user.id; const tz = input.timezone ?? await getUserTimezone(uid); const from = new Date(input.from); const to = new Date(input.to); const bucket = input.bucket ?? (to.getTime() - from.getTime() > 30 * 24 * 60 * 60 * 1000 ? 'weekly' : 'daily')
      const attempts = await prisma.attempt.findMany({ where: { uid, createdAt: { gte: from, lte: to } }, select: { isCorrect: true, createdAt: true } }); if (attempts.length === 0) return []
      const buckets = new Map<string, { attempts: number; correct: number }>()
      for (const a of attempts) { let key: string; const d = new Date(a.createdAt); if (bucket === 'daily') { const ld = new Date(d.toLocaleString('en-US', { timeZone: tz })); key = ld.toISOString().split('T')[0] } else { const sw = new Date(d); const dw = sw.getDay(); const diff = sw.getDate() - dw + (dw === 0 ? -6 : 1); sw.setDate(diff); sw.setHours(0, 0, 0, 0); key = sw.toISOString().split('T')[0] } if (!buckets.has(key)) buckets.set(key, { attempts: 0, correct: 0 }); const bd = buckets.get(key)!; bd.attempts++; if (a.isCorrect) bd.correct++ }
      return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({ date, attempts: data.attempts, correct: data.correct, accuracy: Math.round((data.correct / data.attempts) * 100) }))
    }),
    bySubject: protectedProcedure.input(z.object({ from: z.string().optional(), to: z.string().optional(), timezone: z.string().optional() })).query(async ({ ctx, input }) => {
      const uid = ctx.user.id; const subjects = await prisma.subject.findMany({ where: { uid, status: 'ACTIVE' }, orderBy: { position: 'asc' }, include: { _count: { select: { questions: true } } } })
      const result = await Promise.all(subjects.map(async (s) => { const qs = await prisma.question.findMany({ where: { subjectId: s.id, uid, status: 'ACTIVE' }, select: { id: true } }); const qids = qs.map(q => q.id); const atts = await prisma.attempt.findMany({ where: { questionId: { in: qids }, uid }, select: { isCorrect: true } }); const total = atts.length; const correct = atts.filter(a => a.isCorrect).length; const accuracy = total > 0 ? (correct / total) * 100 : null; return { subjectId: s.id, subjectName: s.name, attempts: total, correct, accuracy, questionsAttempted: new Set(atts.map(a => a.questionId)).size, trend: accuracy !== null ? 'stable' as const : 'no-data' as const } }))
      return result.filter(s => s.attempts > 0)
    }),
    byChapter: protectedProcedure.input(z.object({ from: z.string().optional(), to: z.string().optional(), subjectId: z.string().optional(), timezone: z.string().optional() })).query(async ({ ctx, input }) => {
      const uid = ctx.user.id; const chapters = await prisma.chapter.findMany({ where: { subjectId: input.subjectId, uid, status: 'ACTIVE' }, include: { questions: { select: { id: true } } } })
      const result = await Promise.all(chapters.map(async (ch) => { const qids = ch.questions.map(q => q.id); const atts = await prisma.attempt.findMany({ where: { questionId: { in: qids }, uid }, select: { isCorrect: true, questionId: true } }); const total = atts.length; const correct = atts.filter(a => a.isCorrect).length; const accuracy = total > 0 ? (correct / total) * 100 : null; const dq = new Set(atts.map(a => a.questionId)).size; let status: string; if (total < 5) status = 'Not enough data'; else if (accuracy !== null && accuracy >= 75) status = 'Strong'; else if (accuracy !== null && accuracy >= 50) status = 'Developing'; else status = 'Needs focus'; return { chapterId: ch.id, chapter: ch.name, subjectId: ch.subjectId, questions: dq, attempts: total, correct, accuracy, status, trend: 'stable' as const } }))
      return result
    }),
    recommendation: protectedProcedure.input(z.object({ from: z.string().optional(), to: z.string().optional(), timezone: z.string().optional() })).query(async ({ ctx, input }) => {
      const uid = ctx.user.id; const tz = input.timezone ?? await getUserTimezone(uid); const now = new Date(); const to = new Date(now.toLocaleString('en-US', { timeZone: tz })); to.setHours(0, 0, 0, 0); const from = new Date(to); from.setDate(from.getDate() - 30)
      const [due, attempts] = await Promise.all([prisma.reviewItem.count({ where: { uid, nextReviewAt: { lte: to }, status: { in: ['NEW', 'LEARNING', 'REVIEW', 'LAPSED'] } } }), prisma.attempt.findMany({ where: { uid, createdAt: { gte: from, lte: to } }, select: { isCorrect: true, questionId: true } })])
      const total = attempts.length; const correct = attempts.filter(a => a.isCorrect).length; const accuracy = total > 0 ? (correct / total) * 100 : null
      let action: string; let reason: string
      if (due > 0) { action = 'start-due-review'; reason = `You have ${due} due review${due > 1 ? 's' : ''} waiting for you.` } else if (total === 0) { action = 'start-practice'; reason = 'Start a short practice session to build up your analytics data.' } else if (accuracy !== null && accuracy < 60) { action = 'review-incorrect'; reason = `Your accuracy is ${Math.round(accuracy)}% across ${total} attempts. Review your recent incorrect answers.` } else if (accuracy !== null && accuracy >= 80) { action = 'mixed-challenge'; reason = `Great work! Your accuracy is ${Math.round(accuracy)}%. Try a mixed challenge to push further.` } else { action = 'continue-practice'; reason = `Keep going! Your accuracy is ${accuracy !== null ? Math.round(accuracy) : 0}% across ${total} attempts.` }
      return { action, reason, accuracy, totalAttempts: total, dueReviews: due }
    }),
  }),

  settings: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => { const [us, ns, u] = await Promise.all([prisma.userSettings.findUnique({ where: { userId: ctx.user.id } }), prisma.notificationSettings.findUnique({ where: { userId: ctx.user.id } }), prisma.user.findUnique({ where: { id: ctx.user.id }, select: { id: true, name: true, email: true, image: true } })]); return { userSettings: us, notificationSettings: ns, user: u } }),
    update: protectedProcedure.input(z.object({ timezone: z.string().optional(), theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(), emailNotifications: z.boolean().optional(), pushNotifications: z.boolean().optional(), dailyReminder: z.boolean().optional(), reminderTime: z.string().optional(), masteryThreshold: z.number().int().min(1).max(10).optional(), easeFactorDefault: z.number().min(1.3).max(3.0).optional(), dailyQuestionGoal: z.number().int().min(1).optional(), dailyMinuteGoal: z.number().int().min(1).optional(), defaultPracticeMode: z.enum(['QUICK', 'SUBJECT', 'WEAK', 'REVIEW', 'MOCK']).optional(), defaultQuestionCount: z.number().int().min(1).optional(), timerPreference: z.enum(['OFF', 'ELAPSED', 'COUNTDOWN']).optional(), defaultDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(), explanationPreference: z.enum(['IMMEDIATE', 'END_OF_SESSION']).optional(), hintPreference: z.enum(['ALLOWED', 'DISABLED']).optional(), weekendReview: z.enum(['NORMAL', 'REDUCED', 'OFF']).optional() })).mutation(async ({ ctx, input }) => prisma.userSettings.upsert({ where: { userId: ctx.user.id }, create: { userId: ctx.user.id, ...input }, update: input })),
    updateNotifications: protectedProcedure.input(z.object({ dueReviewEnabled: z.boolean().optional(), dailyGoalEnabled: z.boolean().optional(), importCompletionEnabled: z.boolean().optional(), practiceCompletionEnabled: z.boolean().optional(), preferredHour: z.number().int().min(0).max(23).optional(), inAppEnabled: z.boolean().optional() })).mutation(async ({ ctx, input }) => prisma.notificationSettings.upsert({ where: { userId: ctx.user.id }, create: { userId: ctx.user.id, ...input }, update: input })),
    getSessions: protectedProcedure.query(async ({ ctx }) => prisma.userSession.findMany({ where: { userId: ctx.user.id }, orderBy: { lastSeenAt: 'desc' }, select: { id: true, deviceLabel: true, ipHash: true, userAgentSummary: true, createdAt: true, lastSeenAt: true, expiresAt: true, revokedAt: true } })),
    revokeSession: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => { await prisma.userSession.update({ where: { id: input.id, userId: ctx.user.id }, data: { revokedAt: new Date() } }); return { success: true } }),
    revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => { await prisma.userSession.updateMany({ where: { userId: ctx.user.id }, data: { revokedAt: new Date() } }); return { success: true } }),
    exportData: protectedProcedure.input(z.object({ format: z.enum(['JSON', 'CSV']) })).mutation(async ({ ctx, input }) => { const job = await prisma.dataExportJob.create({ data: { userId: ctx.user.id, format: input.format, status: 'QUEUED', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } }); await logActivity(ctx.user.id, 'EXPORT_REQUESTED', `Data export requested: ${input.format}`, job.id, 'export'); return job }),
    getExportJobs: protectedProcedure.query(async ({ ctx }) => prisma.dataExportJob.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, status: true, format: true, storageObjectKey: true, expiresAt: true, createdAt: true, completedAt: true } })),
    deleteAccount: protectedProcedure.input(z.object({ confirmation: z.string() })).mutation(async ({ ctx, input }) => { if (input.confirmation !== 'DELETE_MY_ACCOUNT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Please confirm account deletion' }); await prisma.$transaction(async (tx) => { await tx.userSettings.delete({ where: { userId: ctx.user.id } }); await tx.notificationSettings.delete({ where: { userId: ctx.user.id } }); await tx.dataExportJob.deleteMany({ where: { userId: ctx.user.id } }); await tx.userSession.updateMany({ where: { userId: ctx.user.id }, data: { revokedAt: new Date() } }); await prisma.user.delete({ where: { id: ctx.user.id } }) }); return { success: true } }),
  }),

  profile: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => prisma.user.findUnique({ where: { id: ctx.user.id }, select: { id: true, name: true, email: true, image: true, createdAt: true, accounts: { select: { provider: true, providerAccountId: true } } } })),
    update: protectedProcedure.input(z.object({ name: z.string().min(1).max(100).optional(), image: z.string().optional() })).mutation(async ({ ctx, input }) => { const data: any = {}; if (input.name !== undefined) data.name = input.name; if (input.image !== undefined) data.image = input.image; return prisma.user.update({ where: { id: ctx.user.id }, data }) }),
  }),

  practice: practiceRouter,
})

export type AppRouter = typeof appRouter
