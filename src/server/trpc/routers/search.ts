import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'

export const searchRouter = createTRPCRouter({
  global: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const query = input.query.toLowerCase()
      const userId = ctx.user.id

      const [questions, notes, collections] = await Promise.all([
        prisma.question.findMany({
          where: {
            userId,
            status: 'ACTIVE',
            OR: [
              { text: { contains: query } },
              { explanation: { contains: query } },
              { tags: { some: { name: { contains: query } } } },
            ],
          },
          take: 10,
          include: {
            subject: { select: { id: true, name: true } },
            _count: { select: { attempts: true } },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.note.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: query } },
              { body: { contains: query } },
            ],
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.collection.findMany({
          where: {
            userId,
            status: 'ACTIVE',
            OR: [
              { name: { contains: query } },
              { description: { contains: query } },
            ],
          },
          take: 10,
          include: {
            _count: { select: { questions: true } },
          },
          orderBy: { updatedAt: 'desc' },
        }),
      ])

      return { questions, notes, collections }
    }),
})
