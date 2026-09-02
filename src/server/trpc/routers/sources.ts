import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import { logActivity } from './helpers'

export const sourcesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      subjectId: z.string().optional(),
      chapterId: z.string().optional(),
      status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
      sourceType: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.user.id }
      if (input.subjectId) where.subjectId = input.subjectId
      if (input.chapterId) where.chapterId = input.chapterId
      if (input.status) where.status = input.status
      if (input.sourceType) where.sourceType = input.sourceType
      if (input.search) {
        where.OR = [
          { title: { contains: input.search } },
          { author: { contains: input.search } },
        ]
      }

      const [sources, total] = await Promise.all([
        prisma.source.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            subject: { select: { id: true, name: true, color: true } },
            chapter: { select: { id: true, name: true } },
            _count: { select: { questionLinks: true } },
          },
        }),
        prisma.source.count({ where }),
      ])

      return { sources, total, page: input.page, pageSize: input.pageSize }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const source = await prisma.source.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          subject: { select: { id: true, name: true, color: true } },
          chapter: { select: { id: true, name: true } },
          questionLinks: {
            include: {
              question: {
                select: {
                  id: true,
                  text: true,
                  difficulty: true,
                  status: true,
                  _count: { select: { attempts: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          importRecords: {
            select: { id: true, fileName: true, status: true, totalQuestions: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      })
      if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source not found' })
      return source
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      sourceType: z.enum(['TEXTBOOK', 'PAST_PAPER', 'HANDOUT', 'PDF', 'DOCX', 'IMAGE', 'WEB', 'NOTE']).default('TEXTBOOK'),
      author: z.string().max(100).optional(),
      edition: z.string().max(50).optional(),
      publisher: z.string().max(100).optional(),
      year: z.number().int().min(1900).max(2100).optional(),
      fileName: z.string().max(500).optional(),
      storageKey: z.string().max(500).optional(),
      externalUrl: z.string().max(2000).optional(),
      subjectId: z.string().optional(),
      chapterId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify subject/chapter ownership if provided
      if (input.subjectId) {
        const subject = await prisma.subject.findFirst({
          where: { id: input.subjectId, userId: ctx.user.id },
        })
        if (!subject) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' })
      }
      if (input.chapterId) {
        const chapter = await prisma.chapter.findFirst({
          where: { id: input.chapterId, userId: ctx.user.id },
        })
        if (!chapter) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' })
        // Ensure chapter belongs to the specified subject
        if (input.subjectId && chapter.subjectId !== input.subjectId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Chapter does not belong to the specified subject' })
        }
      }

      const source = await prisma.source.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
      })

      await logActivity(ctx.user.id, 'SOURCE_CREATED', `Created source "${source.title}"`, source.id, 'source')
      return source
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(200).optional(),
      sourceType: z.enum(['TEXTBOOK', 'PAST_PAPER', 'HANDOUT', 'PDF', 'DOCX', 'IMAGE', 'WEB', 'NOTE']).optional(),
      author: z.string().max(100).optional(),
      edition: z.string().max(50).optional(),
      publisher: z.string().max(100).optional(),
      year: z.number().int().min(1900).max(2100).optional(),
      fileName: z.string().max(500).optional(),
      storageKey: z.string().max(500).optional(),
      externalUrl: z.string().max(2000).optional(),
      subjectId: z.string().nullable().optional(),
      chapterId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const source = await prisma.source.findFirst({
        where: { id, userId: ctx.user.id },
      })
      if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source not found' })

      return prisma.source.update({
        where: { id, userId: ctx.user.id },
        data,
      })
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await prisma.source.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { status: 'ARCHIVED' },
      })
      await logActivity(ctx.user.id, 'SOURCE_ARCHIVED', `Archived source "${source.title}"`, source.id, 'source')
      return source
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await prisma.source.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { status: 'ACTIVE' },
      })
      await logActivity(ctx.user.id, 'SOURCE_RESTORED', `Restored source "${source.title}"`, source.id, 'source')
      return source
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await prisma.source.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { _count: { select: { questionLinks: true } } },
      })
      if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source not found' })

      if (source._count.questionLinks > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete source with ${source._count.questionLinks} linked questions. Unlink them first.`,
        })
      }

      await prisma.source.delete({
        where: { id: input.id, userId: ctx.user.id },
      })
      await logActivity(ctx.user.id, 'SOURCE_DELETED', `Deleted source "${source.title}"`, input.id, 'source')
      return { success: true }
    }),

  // Link a question to a source
  linkQuestion: protectedProcedure
    .input(z.object({
      sourceId: z.string(),
      questionId: z.string(),
      pageNumber: z.string().max(20).optional(),
      section: z.string().max(100).optional(),
      quote: z.string().max(1000).optional(),
      isPrimary: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sourceId, questionId, ...linkData } = input

      // Verify ownership
      const source = await prisma.source.findFirst({ where: { id: sourceId, userId: ctx.user.id } })
      if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source not found' })

      const question = await prisma.question.findFirst({ where: { id: questionId, userId: ctx.user.id } })
      if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })

      const existing = await prisma.questionSource.findUnique({
        where: { questionId_sourceId: { questionId, sourceId } },
      })
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Question already linked to this source' })

      const link = await prisma.questionSource.create({
        data: { sourceId, questionId, ...linkData },
      })
      return link
    }),

  // Unlink a question from a source
  unlinkQuestion: protectedProcedure
    .input(z.object({ sourceId: z.string(), questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const link = await prisma.questionSource.findFirst({
        where: {
          sourceId: input.sourceId,
          questionId: input.questionId,
          source: { userId: ctx.user.id },
        },
      })
      if (!link) throw new TRPCError({ code: 'NOT_FOUND', message: 'Link not found' })

      await prisma.questionSource.delete({
        where: { questionId_sourceId: { questionId: input.questionId, sourceId: input.sourceId } },
      })
      return { success: true }
    }),

  // Get sources for a question
  getForQuestion: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const links = await prisma.questionSource.findMany({
        where: {
          questionId: input.questionId,
          source: { userId: ctx.user.id },
        },
        include: {
          source: {
            select: { id: true, title: true, sourceType: true, author: true, year: true },
          },
        },
        orderBy: { isPrimary: 'desc' },
      })
      return links.map(l => ({ ...l.source, pageNumber: l.pageNumber, section: l.section, quote: l.quote, isPrimary: l.isPrimary }))
    }),
})
