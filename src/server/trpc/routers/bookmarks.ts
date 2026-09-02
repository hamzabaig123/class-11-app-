import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'

export const bookmarksRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.user.id }
      if (input.query) {
        where.question = {
          text: { contains: input.query },
        }
      }

      const [bookmarks, total] = await Promise.all([
        prisma.questionBookmark.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            question: {
              include: {
                subject: { select: { id: true, name: true } },
                topic: { select: { id: true, name: true } },
              },
            },
          },
        }),
        prisma.questionBookmark.count({ where }),
      ])

      return { bookmarks, total, page: input.page, pageSize: input.pageSize }
    }),

  add: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const question = await prisma.question.findFirst({
        where: { id: input.questionId, userId: ctx.user.id },
      })
      if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })

      const existing = await prisma.questionBookmark.findUnique({
        where: { userId_questionId: { userId: ctx.user.id, questionId: input.questionId } },
      })
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Already bookmarked' })

      return prisma.questionBookmark.create({
        data: { userId: ctx.user.id, questionId: input.questionId },
      })
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bookmark = await prisma.questionBookmark.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!bookmark) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bookmark not found' })

      await prisma.questionBookmark.delete({ where: { id: input.id } })
      return { success: true }
    }),

  toggle: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.questionBookmark.findUnique({
        where: { userId_questionId: { userId: ctx.user.id, questionId: input.questionId } },
      })

      if (existing) {
        await prisma.questionBookmark.delete({ where: { id: existing.id } })
        return { bookmarked: false }
      } else {
        await prisma.questionBookmark.create({
          data: { userId: ctx.user.id, questionId: input.questionId },
        })
        return { bookmarked: true }
      }
    }),
})
