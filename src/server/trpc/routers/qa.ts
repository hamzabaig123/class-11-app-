import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'

export const qaRouter = createTRPCRouter({
  // Get paginated questions list with filters
  list: protectedProcedure
    .input(z.object({
      subjectId: z.string().optional(),
      chapterId: z.string().optional(),
      topicId: z.string().optional(),
      questionType: z.enum(['MCQ', 'SHORT', 'LONG']).optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      bookmarked: z.boolean().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
      sort: z.enum(['newest', 'oldest', 'updated', 'difficulty', 'marks']).default('updated'),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { userId: ctx.user.id }
      if (input.subjectId) where.subjectId = input.subjectId
      if (input.chapterId) where.chapterId = input.chapterId
      if (input.topicId) where.topicId = input.topicId
      if (input.questionType) where.questionType = input.questionType
      if (input.difficulty) where.difficulty = input.difficulty
      if (input.status) where.status = input.status
      if (input.search) {
        where.OR = [
          { text: { contains: input.search } },
          { explanation: { contains: input.search } },
        ]
      }
      if (input.bookmarked) {
        where.bookmarks = { some: { userId: ctx.user.id } }
      }

      let orderBy: Record<string, unknown> = { updatedAt: 'desc' }
      switch (input.sort) {
        case 'newest': orderBy = { createdAt: 'desc' }; break
        case 'oldest': orderBy = { createdAt: 'asc' }; break
        case 'updated': orderBy = { updatedAt: 'desc' }; break
        case 'difficulty': orderBy = { difficulty: 'asc' }; break
        case 'marks': orderBy = { marks: 'desc' }; break
      }

      const [total, questions] = await Promise.all([
        prisma.question.count({ where }),
        prisma.question.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy,
          include: {
            subject: { select: { id: true, name: true, color: true } },
            chapter: { select: { id: true, name: true } },
            topic: { select: true },
            answer: true,
            answerContent: true,
            tags: true,
            _count: { select: { attempts: true, bookmarks: true, markingPoints: true } },
          },
        }),
      ])

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
        questions,
      }
    }),

  // Get single question with full details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const question = await prisma.question.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          subject: true,
          chapter: true,
          topic: true,
          options: { orderBy: { position: 'asc' } },
          answer: true,
          answerContent: true,
          tags: true,
          markingPoints: { orderBy: { displayOrder: 'asc' } },
          questionSources: { include: { source: true } },
          relatedFrom: { include: { relatedQuestion: { select: { id: true, text: true, difficulty: true } } } },
          relatedTo: { include: { question: { select: { id: true, text: true, difficulty: true } } } },
          _count: { select: { attempts: true, bookmarks: true } },
        },
      })
      if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      return question
    }),

  // Toggle bookmark
  toggleBookmark: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.questionBookmark.findUnique({
        where: { userId_questionId: { userId: ctx.user.id, questionId: input.questionId } },
      })
      if (existing) {
        await prisma.questionBookmark.delete({ where: { id: existing.id } })
        return { bookmarked: false }
      }
      await prisma.questionBookmark.create({ data: { userId: ctx.user.id, questionId: input.questionId } })
      return { bookmarked: true }
    }),

  // Report a question
  report: protectedProcedure
    .input(z.object({
      questionId: z.string(),
      category: z.enum(['incorrect', 'unclear', 'duplicate', 'misclassified', 'other']),
      description: z.string().min(10).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.questionReport.create({
        data: {
          questionId: input.questionId,
          reporterId: ctx.user.id,
          category: input.category,
          description: input.description,
        },
      })
    }),

  // Get user's bookmarks
  bookmarks: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      sort: z.enum(['newest', 'oldest', 'due']).default('newest'),
    }))
    .query(async ({ ctx, input }) => {
      let orderBy: Record<string, unknown> = { createdAt: 'desc' }
      if (input.sort === 'oldest') orderBy = { createdAt: 'asc' }
      if (input.sort === 'due') orderBy = { nextReviewAt: 'asc' }

      const [total, bookmarks] = await Promise.all([
        prisma.questionBookmark.count({ where: { userId: ctx.user.id } }),
        prisma.questionBookmark.findMany({
          where: { userId: ctx.user.id },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy,
          include: {
            question: {
              include: {
                subject: { select: { id: true, name: true, color: true } },
                chapter: { select: { id: true, name: true } },
                answer: true,
                answerContent: true,
              },
            },
          },
        }),
      ])

      return { total, page: input.page, pageSize: input.pageSize, bookmarks }
    }),

  // Get marking points for a question
  markingPoints: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.questionMarkingPoint.findMany({
        where: { questionId: input.questionId },
        orderBy: { displayOrder: 'asc' },
      })
    }),

  // Get related questions
  related: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const relations = await prisma.questionRelation.findMany({
        where: { OR: [{ questionId: input.questionId }, { relatedQuestionId: input.questionId }] },
        include: {
          question: { select: { id: true, text: true, difficulty: true, questionType: true } },
          relatedQuestion: { select: { id: true, text: true, difficulty: true, questionType: true } },
        },
      })
      return relations.map(r => {
        if (r.questionId === input.questionId) return r.relatedQuestion
        return r.question
      })
    }),
})
