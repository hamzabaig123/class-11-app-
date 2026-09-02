import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'

const subjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
})

const chapterSchema = z.object({
  name: z.string().min(1).max(100),
  chapterNo: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
})

export const subjectsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ includeArchived: z.boolean().default(false) }).default({}))
    .query(async ({ ctx, input }) => {
      return prisma.subject.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.includeArchived ? {} : { status: 'ACTIVE' }),
        },
        orderBy: { position: 'asc' },
        include: {
          _count: {
            select: {
              questions: { where: { status: { in: ['DRAFT', 'PUBLISHED'] } } },
              chapters: { where: { status: 'ACTIVE' } },
              sources: { where: { status: 'ACTIVE' } },
            },
          },
        },
      })
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const subject = await prisma.subject.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          chapters: {
            where: { status: 'ACTIVE' },
            orderBy: { position: 'asc' },
            include: {
              _count: {
                select: {
                  questions: { where: { status: { in: ['DRAFT', 'PUBLISHED'] } } },
                  sources: { where: { status: 'ACTIVE' } },
                },
              },
            },
          },
          sources: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              questions: { where: { status: { in: ['DRAFT', 'PUBLISHED'] } } },
              chapters: { where: { status: 'ACTIVE' } },
              sources: { where: { status: 'ACTIVE' } },
            },
          },
        },
      })
      if (!subject) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' })
      return subject
    }),

  create: protectedProcedure
    .input(subjectSchema)
    .mutation(async ({ ctx, input }) => {
      const count = await prisma.subject.count({ where: { userId: ctx.user.id } })
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const subject = await prisma.subject.create({
        data: {
          ...input,
          slug: `${slug}-${Date.now().toString(36)}`,
          position: count,
          userId: ctx.user.id,
        },
      })
      await prisma.activityEvent.create({
        data: {
          userId: ctx.user.id,
          type: 'SUBJECT_CREATED',
          title: `Created subject "${input.name}"`,
          entityId: subject.id,
          entityType: 'Subject',
        },
      })
      return subject
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(subjectSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const existing = await prisma.subject.findFirst({
        where: { id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' })
      return prisma.subject.update({
        where: { id },
        data,
      })
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.subject.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' })
      return prisma.subject.update({
        where: { id: input.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      })
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.subject.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' })
      return prisma.subject.update({
        where: { id: input.id },
        data: { status: 'ACTIVE', archivedAt: null },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), permanent: z.boolean().default(false), confirmationName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.subject.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          _count: {
            select: {
              questions: true,
              chapters: true,
              sources: true,
            },
          },
        },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' })

      if (input.permanent) {
        if (existing._count.questions > 0 && input.confirmationName !== existing.name) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot permanently delete subject with questions. Archive instead.',
          })
        }
        await prisma.subject.delete({ where: { id: input.id } })
        return { deleted: true }
      }

      return prisma.subject.update({
        where: { id: input.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      })
    }),

  reorder: protectedProcedure
    .input(z.object({ items: z.array(z.object({ id: z.string(), position: z.number() })) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.$transaction(
        input.items.map((item) =>
          prisma.subject.updateMany({
            where: { id: item.id, userId: ctx.user.id },
            data: { position: item.position },
          })
        )
      )
      return { success: true }
    }),
})

export const chaptersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ subjectId: z.string(), includeArchived: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      return prisma.chapter.findMany({
        where: {
          subjectId: input.subjectId,
          userId: ctx.user.id,
          ...(input.includeArchived ? {} : { status: 'ACTIVE' }),
        },
        orderBy: { position: 'asc' },
        include: {
          _count: {
            select: {
              questions: { where: { status: { in: ['DRAFT', 'PUBLISHED'] } } },
              sources: { where: { status: 'ACTIVE' } },
            },
          },
        },
      })
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const chapter = await prisma.chapter.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          subject: true,
          sources: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } },
          _count: {
            select: {
              questions: { where: { status: { in: ['DRAFT', 'PUBLISHED'] } } },
              sources: { where: { status: 'ACTIVE' } },
            },
          },
        },
      })
      if (!chapter) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' })
      return chapter
    }),

  create: protectedProcedure
    .input(z.object({ subjectId: z.string() }).merge(chapterSchema))
    .mutation(async ({ ctx, input }) => {
      const { subjectId, ...data } = input
      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, userId: ctx.user.id },
      })
      if (!subject) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subject not found' })
      const count = await prisma.chapter.count({ where: { subjectId } })
      const chapter = await prisma.chapter.create({
        data: {
          ...data,
          position: count,
          subjectId,
          userId: ctx.user.id,
        },
      })
      await prisma.activityEvent.create({
        data: {
          userId: ctx.user.id,
          type: 'CHAPTER_CREATED',
          title: `Created chapter "${data.name}"`,
          entityId: chapter.id,
          entityType: 'Chapter',
        },
      })
      return chapter
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(chapterSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const existing = await prisma.chapter.findFirst({
        where: { id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' })
      return prisma.chapter.update({
        where: { id },
        data,
      })
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.chapter.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' })
      return prisma.chapter.update({
        where: { id: input.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      })
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.chapter.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' })
      return prisma.chapter.update({
        where: { id: input.id },
        data: { status: 'ACTIVE', archivedAt: null },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), permanent: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.chapter.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { _count: { select: { questions: true } } },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' })

      if (input.permanent) {
        if (existing._count.questions > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot permanently delete chapter with questions. Archive instead.',
          })
        }
        await prisma.chapter.delete({ where: { id: input.id } })
        return { deleted: true }
      }

      return prisma.chapter.update({
        where: { id: input.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      })
    }),

  reorder: protectedProcedure
    .input(z.object({ subjectId: z.string(), items: z.array(z.object({ id: z.string(), position: z.number() })) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.$transaction(
        input.items.map((item) =>
          prisma.chapter.updateMany({
            where: { id: item.id, subjectId: input.subjectId, userId: ctx.user.id },
            data: { position: item.position },
          })
        )
      )
      return { success: true }
    }),
})
