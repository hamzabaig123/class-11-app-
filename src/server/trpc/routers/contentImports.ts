import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'

export const contentImportsRouter = createTRPCRouter({
  // List imports for current user
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { ownerId: ctx.user.id }
      if (input.status) where.status = input.status

      const [imports, total] = await Promise.all([
        prisma.contentImport.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            subject: { select: { id: true, name: true } },
            chapter: { select: { id: true, name: true } },
            _count: { select: { items: true, pages: true } },
          },
        }),
        prisma.contentImport.count({ where }),
      ])

      return { imports, total, page: input.page, pageSize: input.pageSize }
    }),

  // Get single import with details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const importRecord = await prisma.contentImport.findFirst({
        where: { id: input.id, ownerId: ctx.user.id },
        include: {
          subject: true,
          chapter: true,
          pages: {
            orderBy: { pageNumber: 'asc' },
            include: { blocks: true },
          },
          items: {
            orderBy: { createdAt: 'asc' },
            include: { block: true, revisions: true, duplicates: true },
          },
          errors: { orderBy: { createdAt: 'desc' } },
          auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      })

      if (!importRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })
      }

      return importRecord
    }),

  // Create a new import record (after file uploaded)
  create: protectedProcedure
    .input(z.object({
      originalFilename: z.string().min(1).max(500),
      storageKey: z.string().min(1),
      fileMimeType: z.string().min(1).max(200),
      fileSizeBytes: z.number().int().positive(),
      sha256Checksum: z.string().optional(),
      subjectId: z.string().optional(),
      chapterId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify subject/chapter relationship if both provided
      if (input.subjectId && input.chapterId) {
        const chapter = await prisma.chapter.findFirst({
          where: { id: input.chapterId, subjectId: input.subjectId, userId: ctx.user.id },
        })
        if (!chapter) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Chapter does not belong to selected subject' })
        }
      }

      const importRecord = await prisma.contentImport.create({
        data: {
          ...input,
          ownerId: ctx.user.id,
          status: 'uploaded',
        },
      })

      await prisma.importAuditLog.create({
        data: {
          importId: importRecord.id,
          actorId: ctx.user.id,
          action: 'created',
          entityType: 'import',
          entityId: importRecord.id,
        },
      })

      return importRecord
    }),

  // Start processing
  startProcessing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.contentImport.findFirst({
        where: { id: input.id, ownerId: ctx.user.id },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      await prisma.contentImport.update({
        where: { id: input.id },
        data: { status: 'extracting', progressStep: 'Starting extraction...' },
      })

      await prisma.importAuditLog.create({
        data: {
          importId: input.id,
          actorId: ctx.user.id,
          action: 'processing_started',
          entityType: 'import',
          entityId: input.id,
        },
      })

      return { success: true }
    }),

  // Cancel import
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.contentImport.findFirst({
        where: { id: input.id, ownerId: ctx.user.id },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })
      if (importRecord.status === 'published') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel a published import' })
      }

      await prisma.contentImport.update({
        where: { id: input.id },
        data: { status: 'cancelled' },
      })

      await prisma.importAuditLog.create({
        data: {
          importId: input.id,
          actorId: ctx.user.id,
          action: 'cancelled',
          entityType: 'import',
          entityId: input.id,
        },
      })

      return { success: true }
    }),

  // Retry failed import
  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.contentImport.findFirst({
        where: { id: input.id, ownerId: ctx.user.id },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      await prisma.contentImport.update({
        where: { id: input.id },
        data: { status: 'extracting', errorCode: null, errorMessage: null },
      })

      await prisma.importAuditLog.create({
        data: {
          importId: input.id,
          actorId: ctx.user.id,
          action: 'retried',
          entityType: 'import',
          entityId: input.id,
        },
      })

      return { success: true }
    }),

  // Get import items for review
  getItems: protectedProcedure
    .input(z.object({
      importId: z.string(),
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const importRecord = await prisma.contentImport.findFirst({
        where: { id: input.importId, ownerId: ctx.user.id },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      const where: any = { importId: input.importId }
      if (input.status) where.status = input.status

      const [items, total] = await Promise.all([
        prisma.importItem.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            block: true,
            revisions: { orderBy: { version: 'desc' }, take: 1 },
            duplicates: true,
          },
        }),
        prisma.importItem.count({ where }),
      ])

      return { items, total, page: input.page, pageSize: input.pageSize }
    }),

  // Get single item with full details
  getItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await prisma.importItem.findFirst({
        where: { id: input.id, import: { ownerId: ctx.user.id } },
        include: {
          block: true,
          import: { include: { subject: true, chapter: true } },
          revisions: { orderBy: { version: 'desc' } },
          duplicates: true,
          errors: true,
        },
      })

      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' })
      return item
    }),

  // Save reviewer corrections
  updateItem: protectedProcedure
    .input(z.object({
      id: z.string(),
      questionContent: z.string().optional(),
      answerContent: z.string().optional(),
      questionType: z.enum(['MCQ', 'SHORT', 'LONG']).optional(),
      marks: z.number().int().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      keyPoints: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const item = await prisma.importItem.findFirst({
        where: { id, import: { ownerId: ctx.user.id } },
      })
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' })

      // Create revision
      const lastRevision = await prisma.importItemRevision.findFirst({
        where: { importItemId: id },
        orderBy: { revisionNumber: 'desc' },
      })
      const nextVersion = (lastRevision?.revisionNumber ?? 0) + 1

      await prisma.$transaction([
        prisma.importItem.update({
          where: { id },
          data: {
            proposedQuestionContent: data.questionContent ?? item.proposedQuestionContent,
            proposedAnswerContent: data.answerContent ?? item.proposedAnswerContent,
            questionType: data.questionType ?? item.questionType,
            proposedMarks: data.marks ?? item.proposedMarks,
            proposedDifficulty: data.difficulty ?? item.proposedDifficulty,
            proposedKeyPointsJson: data.keyPoints ? JSON.stringify(data.keyPoints) : item.proposedKeyPointsJson,
            status: 'needs_review',
          },
        }),
        prisma.importItemRevision.create({
          data: {
            importItemId: id,
            revisionNumber: nextVersion,
            questionContent: data.questionContent ?? item.proposedQuestionContent,
            answerContent: data.answerContent ?? item.proposedAnswerContent,
            metadataJson: JSON.stringify({
              questionType: data.questionType ?? item.questionType,
              marks: data.marks ?? item.proposedMarks,
              difficulty: data.difficulty ?? item.proposedDifficulty,
              keyPoints: data.keyPoints ?? JSON.parse(item.proposedKeyPointsJson || '[]'),
            }),
            changeSource: 'reviewer',
            changedBy: ctx.user.id,
          },
        }),
      ])

      return { success: true }
    }),

  // Approve item
  approveItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.importItem.findFirst({
        where: { id: input.id, import: { ownerId: ctx.user.id } },
        include: { import: true },
      })
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' })

      await prisma.$transaction([
        prisma.importItem.update({
          where: { id: input.id },
          data: { status: 'approved', reviewerId: ctx.user.id, reviewedAt: new Date() },
        }),
        prisma.contentImport.update({
          where: { id: item.importId },
          data: { approvedItems: { increment: 1 } },
        }),
        prisma.importAuditLog.create({
          data: {
            importId: item.importId,
            actorId: ctx.user.id,
            action: 'item_approved',
            entityType: 'import_item',
            entityId: input.id,
          },
        }),
      ])

      return { success: true }
    }),

  // Reject item
  rejectItem: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.importItem.findFirst({
        where: { id: input.id, import: { ownerId: ctx.user.id } },
        include: { import: true },
      })
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' })

      await prisma.$transaction([
        prisma.importItem.update({
          where: { id: input.id },
          data: { status: 'rejected', reviewerId: ctx.user.id, reviewedAt: new Date() },
        }),
        prisma.contentImport.update({
          where: { id: item.importId },
          data: { rejectedCount: { increment: 1 } },
        }),
        prisma.importAuditLog.create({
          data: {
            importId: item.importId,
            actorId: ctx.user.id,
            action: 'item_rejected',
            entityType: 'import_item',
            entityId: input.id,
            metadataJson: input.reason ? JSON.stringify({ reason: input.reason }) : undefined,
          },
        }),
      ])

      return { success: true }
    }),

  // Publish approved items
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.contentImport.findFirst({
        where: { id: input.id, ownerId: ctx.user.id },
        include: { items: { where: { status: 'approved' } } },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      let publishedCount = 0
      for (const item of importRecord.items) {
        try {
          // Create the actual question
          const question = await prisma.question.create({
            data: {
              text: item.proposedQuestionContent,
              explanation: item.proposedAnswerContent,
              questionType: item.questionType || 'SHORT',
              marks: item.proposedMarks,
              difficulty: item.proposedDifficulty || 'MEDIUM',
              status: 'ACTIVE',
              userId: ctx.user.id,
              subjectId: item.proposedSubjectId || importRecord.subjectId,
              chapterId: item.proposedChapterId || importRecord.chapterId,
              topicId: item.proposedTopicId,
            },
          })

          await prisma.$transaction([
            prisma.importItem.update({
              where: { id: item.id },
              data: { status: 'published' },
            }),
            prisma.questionSource.create({
              data: {
                questionId: question.id,
                sourceId: importRecord.storageKey,
                isPrimary: true,
              },
            }),
          ])
          publishedCount++
        } catch (error) {
          await prisma.importError.create({
            data: {
              importId: importRecord.id,
              itemId: item.id,
              stage: 'publish',
              errorCode: 'PUBLISH_FAILED',
              safeMessage: 'Failed to publish question',
              retryable: true,
            },
          })
        }
      }

      await prisma.$transaction([
        prisma.contentImport.update({
          where: { id: input.id },
          data: {
            status: publishedCount === importRecord.items.length ? 'published' : 'partially_published',
            publishedItems: publishedCount,
            completedAt: new Date(),
          },
        }),
        prisma.importAuditLog.create({
          data: {
            importId: input.id,
            actorId: ctx.user.id,
            action: 'published',
            entityType: 'import',
            entityId: input.id,
            metadataJson: JSON.stringify({ publishedCount, totalItems: importRecord.items.length }),
          },
        }),
      ])

      return { success: true, publishedCount, totalItems: importRecord.items.length }
    }),
})
