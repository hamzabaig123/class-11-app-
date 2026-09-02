import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'

const questionInputSchema = z.object({
  text: z.string().min(10).max(5000),
  explanation: z.string().max(10000).optional(),
  hint: z.string().max(1000).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  questionType: z.enum(['MCQ', 'SHORT', 'LONG']).default('SHORT'),
  marks: z.number().int().min(1).max(100).optional(),
  estimatedMinutes: z.number().int().min(1).max(120).optional(),
  examLabel: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  subjectId: z.string().optional(),
  chapterId: z.string().optional(),
  topicId: z.string().optional(),
  sourceId: z.string().optional(),
  pageNumber: z.string().max(50).optional(),
  correctLabel: z.enum(['A', 'B', 'C', 'D']).optional(),
  options: z.array(z.object({ label: z.string(), text: z.string().min(1) })).optional(),
  answerContent: z.string().max(50000).optional(),
  keyPoints: z.array(z.string()).optional(),
  markingPoints: z.array(z.object({ pointText: z.string(), marks: z.number().int().optional() })).optional(),
  tags: z.array(z.string()).optional(),
})

export const adminQARouter = createTRPCRouter({
  // Admin list with all statuses
  adminList: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      questionType: z.enum(['MCQ', 'SHORT', 'LONG']).optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { userId: ctx.user.id }
      if (input.status) where.status = input.status
      if (input.questionType) where.questionType = input.questionType
      if (input.search) {
        where.OR = [
          { text: { contains: input.search } },
          { explanation: { contains: input.search } },
        ]
      }

      const [total, questions] = await Promise.all([
        prisma.question.count({ where }),
        prisma.question.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { updatedAt: 'desc' },
          include: {
            subject: { select: { id: true, name: true } },
            chapter: { select: { id: true, name: true } },
            _count: { select: { attempts: true, bookmarks: true, reports: true } },
          },
        }),
      ])

      return { total, page: input.page, pageSize: input.pageSize, questions }
    }),

  // Create draft
  create: protectedProcedure
    .input(questionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const question = await prisma.$transaction(async (tx) => {
        const q = await tx.question.create({
          data: {
            text: input.text,
            explanation: input.explanation,
            hint: input.hint,
            difficulty: input.difficulty,
            questionType: input.questionType,
            marks: input.marks,
            estimatedMinutes: input.estimatedMinutes,
            examLabel: input.examLabel,
            year: input.year,
            status: 'DRAFT',
            userId: ctx.user.id,
            subjectId: input.subjectId,
            chapterId: input.chapterId,
            topicId: input.topicId,
          },
        })

        // Create MCQ options/answer if provided
        if (input.questionType === 'MCQ' && input.options && input.correctLabel) {
          await tx.questionOption.createMany({
            data: input.options.map((o, i) => ({
              questionId: q.id,
              label: o.label,
              text: o.text,
              position: i,
            })),
          })
          await tx.questionAnswer.create({
            data: { questionId: q.id, correctLabel: input.correctLabel, explanation: input.explanation },
          })
        }

        // Create long-form answer content
        if (input.answerContent) {
          await tx.questionAnswerContent.create({
            data: {
              questionId: q.id,
              content: input.answerContent,
              keyPoints: JSON.stringify(input.keyPoints || []),
              wordCount: input.answerContent.split(/\s+/).length,
            },
          })
        }

        // Create marking points
        if (input.markingPoints && input.markingPoints.length > 0) {
          await tx.questionMarkingPoint.createMany({
            data: input.markingPoints.map((mp, i) => ({
              questionId: q.id,
              pointText: mp.pointText,
              marks: mp.marks,
              displayOrder: i,
            })),
          })
        }

        // Create tags
        if (input.tags && input.tags.length > 0) {
          await tx.questionTag.createMany({
            data: input.tags.map(name => ({ questionId: q.id, name })),
          })
        }

        // Create source link
        if (input.sourceId) {
          await tx.questionSource.create({
            data: { questionId: q.id, sourceId: input.sourceId, pageNumber: input.pageNumber, isPrimary: true },
          })
        }

        // Create audit log
        await tx.contentAuditLog.create({
          data: { actorId: ctx.user.id, entityType: 'question', entityId: q.id, action: 'create' },
        })

        return q
      })

      return question
    }),

  // Update draft
  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(questionInputSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const existing = await prisma.question.findFirst({ where: { id, userId: ctx.user.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (existing.status === 'PUBLISHED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot edit published question. Create a revision instead.' })

      return prisma.question.update({ where: { id }, data })
    }),

  // Submit for review
  submitForReview: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.question.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (!['DRAFT', 'CHANGES_REQUESTED'].includes(existing.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only submit drafts or revised questions' })
      }
      return prisma.question.update({ where: { id: input.id }, data: { status: 'SUBMITTED' } })
    }),

  // Approve
  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.question.findFirst({ where: { id: input.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (existing.status !== 'SUBMITTED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only approve submitted questions' })
      return prisma.question.update({ where: { id: input.id }, data: { status: 'APPROVED' } })
    }),

  // Request changes
  requestChanges: protectedProcedure
    .input(z.object({ id: z.string(), feedback: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.question.findFirst({ where: { id: input.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      return prisma.question.update({ where: { id: input.id }, data: { status: 'CHANGES_REQUESTED' } })
    }),

  // Publish
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.question.findFirst({ where: { id: input.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (!['APPROVED', 'PUBLISHED'].includes(existing.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only publish approved questions' })
      }
      return prisma.question.update({ where: { id: input.id }, data: { status: 'PUBLISHED' } })
    }),

  // Archive
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.question.findFirst({ where: { id: input.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      return prisma.question.update({ where: { id: input.id }, data: { status: 'ARCHIVED', archivedAt: new Date() } })
    }),

  // Delete
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.question.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (existing.status === 'PUBLISHED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete published question. Archive it first.' })
      await prisma.question.delete({ where: { id: input.id } })
      return { deleted: true }
    }),

  // Get reports
  reports: protectedProcedure
    .input(z.object({ status: z.string().optional(), page: z.number().default(1), pageSize: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}
      if (input.status) where.status = input.status
      const [total, reports] = await Promise.all([
        prisma.questionReport.count({ where }),
        prisma.questionReport.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: 'desc' },
          include: { question: { select: { id: true, text: true } }, reporter: { select: { id: true, name: true } } },
        }),
      ])
      return { total, page: input.page, pageSize: input.pageSize, reports }
    }),

  // Resolve report
  resolveReport: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(['resolved', 'dismissed']) }))
    .mutation(async ({ ctx, input }) => {
      return prisma.questionReport.update({
        where: { id: input.id },
        data: { status: input.status, resolvedBy: ctx.user.id, resolvedAt: new Date() },
      })
    }),
})
