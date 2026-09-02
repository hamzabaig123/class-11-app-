import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import { runImportPipeline } from '@/lib/ai-studio/pipeline'

export const importsRouter = createTRPCRouter({
  // Create a new import — starts extraction+structuring pipeline
  create: protectedProcedure
    .input(z.object({
      fileName: z.string().min(1).max(500),
      fileSize: z.number().int().positive().max(50 * 1024 * 1024),
      fileType: z.string().min(1).max(200),
      sourceType: z.enum(['pdf', 'docx', 'txt', 'image', 'ai_generated']).default('pdf'),
      subject: z.string().max(100).optional(),
      topic: z.string().max(100).optional(),
      text: z.string().max(100000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.import.create({
        data: {
          userId: ctx.user.id,
          fileName: input.fileName,
          fileSize: input.fileSize,
          fileType: input.fileType,
          sourceType: input.sourceType,
          status: 'queued',
        },
      }).catch((error: any) => {
        // Foreign key violation means the user no longer exists in the DB
        // (e.g. DB reset/reseed). Force re-authentication.
        if (error?.code === 'P2003') {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Your session is no longer valid. Please sign in again.',
          })
        }
        throw error
      })

      // Run processing (fire-and-forget; frontend polls getStatus for progress).
      // Note: for actual PDF/DOCX/image *files*, use POST /api/imports/upload
      // instead — this mutation only has the pasted `text`, not file bytes.
      runImportPipeline(importRecord.id, {
        sourceType: input.sourceType,
        fileName: input.fileName,
        text: input.text,
        subject: input.subject,
        topic: input.topic,
      })

      return { id: importRecord.id }
    }),

  // Retry a failed import
  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.import.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      // We only have something to retry with if text was previously extracted
      // and stored, or this was an ai_generated import. File-based imports
      // (pdf/docx/image) that never got that far need the file re-uploaded —
      // the original bytes were never persisted.
      if (!importRecord.extractedText && importRecord.sourceType !== 'ai_generated') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nothing to retry — please re-upload the file to try again.',
        })
      }

      await prisma.import.update({
        where: { id: input.id },
        data: { status: 'queued', retryCount: { increment: 1 }, errorReason: null, errorMessage: null },
      })

      runImportPipeline(importRecord.id, {
        sourceType: importRecord.sourceType,
        fileName: importRecord.fileName,
        text: importRecord.extractedText || undefined,
      })

      return { success: true }
    }),

  // Get import status (polled by frontend)
  getStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const importRecord = await prisma.import.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      const [pending, approved, rejected] = await Promise.all([
        prisma.importedQuestion.count({ where: { importId: input.id, status: 'pending' } }),
        prisma.importedQuestion.count({ where: { importId: input.id, status: 'approved' } }),
        prisma.importedQuestion.count({ where: { importId: input.id, status: 'rejected' } }),
      ])

      return {
        id: importRecord.id,
        fileName: importRecord.fileName,
        fileSize: importRecord.fileSize,
        fileType: importRecord.fileType,
        sourceType: importRecord.sourceType,
        status: importRecord.status,
        errorReason: importRecord.errorReason,
        errorMessage: importRecord.errorMessage,
        progressStep: importRecord.progressStep,
        retryCount: importRecord.retryCount,
        totalQuestions: importRecord.totalQuestions,
        approvedCount: importRecord.approvedCount,
        rejectedCount: importRecord.rejectedCount,
        pendingCount: importRecord.pendingCount,
        createdAt: importRecord.createdAt,
        updatedAt: importRecord.updatedAt,
        completedAt: importRecord.completedAt,
        candidateCounts: { pending, approved, rejected },
      }
    }),

  // Get paginated staging questions for review tabs
  reviewList: protectedProcedure
    .input(z.object({
      importId: z.string(),
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const importRecord = await prisma.import.findFirst({
        where: { id: input.importId, userId: ctx.user.id },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      const where: any = { importId: input.importId }
      if (input.status) where.status = input.status

      const [candidates, total] = await Promise.all([
        prisma.importedQuestion.findMany({
          where,
          orderBy: [{ confidence: 'asc' }, { createdAt: 'asc' }],
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.importedQuestion.count({ where }),
      ])

      return { candidates, total, page: input.page, pageSize: input.pageSize }
    }),

  // Edit a staging question
  editStaging: protectedProcedure
    .input(z.object({
      id: z.string(),
      questionText: z.string().min(1).max(5000).optional(),
      options: z.array(z.object({ label: z.enum(['A', 'B', 'C', 'D']), text: z.string().min(1).max(1000) })).length(4).optional(),
      correctLabel: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
      explanation: z.string().max(5000).nullable().optional(),
      hint: z.string().max(1000).nullable().optional(),
      subjectName: z.string().max(100).optional(),
      topicName: z.string().max(100).optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const staging = await prisma.importedQuestion.findFirst({
        where: { id: input.id, import: { userId: ctx.user.id } },
      })
      if (!staging) throw new TRPCError({ code: 'NOT_FOUND', message: 'Staging question not found' })

      const { id, options, ...rest } = input
      const data: any = { ...rest, edited: true }
      if (options) data.options = JSON.stringify(options)

      await prisma.importedQuestion.update({ where: { id }, data })
      return { success: true }
    }),

  // Approve a single staging question — transactionally creates Question record
  approveOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const staging = await prisma.importedQuestion.findFirst({
        where: { id: input.id, import: { userId: ctx.user.id } },
        include: { import: true },
      })
      if (!staging) throw new TRPCError({ code: 'NOT_FOUND', message: 'Staging question not found' })

      await prisma.$transaction(async (tx) => {
        let subject = null
        if (staging.subjectName) {
          subject = await tx.subject.findFirst({ where: { userId: ctx.user.id, name: staging.subjectName } })
          if (!subject) subject = await tx.subject.create({ data: { name: staging.subjectName, userId: ctx.user.id } })
        }

        let topic = null
        if (staging.topicName && subject) {
          topic = await tx.topic.findFirst({ where: { userId: ctx.user.id, subjectId: subject.id, name: staging.topicName } })
          if (!topic) topic = await tx.topic.create({ data: { name: staging.topicName, userId: ctx.user.id, subjectId: subject.id } })
        }

        const question = await tx.question.create({
          data: {
            text: staging.questionText,
            explanation: staging.explanation,
            hint: staging.hint,
            difficulty: staging.difficulty || 'MEDIUM',
            status: 'ACTIVE',
            userId: ctx.user.id,
            subjectId: subject?.id,
            topicId: topic?.id,
          },
        })

        const options = JSON.parse(staging.options || '[]')
        for (let i = 0; i < options.length; i++) {
          const label = options[i].label || String.fromCharCode(65 + i) // A, B, C, D...
          await tx.questionOption.create({
            data: { questionId: question.id, label, text: options[i].text, position: i },
          })
        }

        // Only create answer record if correctLabel is set
        if (staging.correctLabel) {
          await tx.questionAnswer.create({
            data: { questionId: question.id, correctLabel: staging.correctLabel!, explanation: staging.explanation },
          })
        }

        await tx.reviewItem.create({
          data: { questionId: question.id, userId: ctx.user.id, status: 'NEW', nextReviewAt: new Date() },
        })

        await tx.importedQuestion.update({
          where: { id: staging.id },
          data: { status: 'approved', questionId: question.id },
        })

        const approvedCount = await tx.importedQuestion.count({ where: { importId: staging.importId, status: 'approved' } })
        const pendingCount = await tx.importedQuestion.count({ where: { importId: staging.importId, status: 'pending' } })
        await tx.import.update({ where: { id: staging.importId }, data: { approvedCount, pendingCount } })
      })

      return { success: true }
    }),

  // Reject a staging question
  rejectOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const staging = await prisma.importedQuestion.findFirst({
        where: { id: input.id, import: { userId: ctx.user.id } },
        include: { import: true },
      })
      if (!staging) throw new TRPCError({ code: 'NOT_FOUND', message: 'Staging question not found' })

      await prisma.$transaction(async (tx) => {
        await tx.importedQuestion.update({ where: { id: input.id }, data: { status: 'rejected' } })
        const rejectedCount = await tx.importedQuestion.count({ where: { importId: staging.importId, status: 'rejected' } })
        const pendingCount = await tx.importedQuestion.count({ where: { importId: staging.importId, status: 'pending' } })
        await tx.import.update({ where: { id: staging.importId }, data: { rejectedCount, pendingCount } })
      })

      return { success: true }
    }),

  // Bulk approve all pending questions (including those without correctLabel)
  bulkApprove: protectedProcedure
    .input(z.object({ importId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.import.findFirst({
        where: { id: input.importId, userId: ctx.user.id },
        include: { importedQuestions: { where: { status: 'pending' } } },
      })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      for (const staging of importRecord.importedQuestions) {
        await prisma.$transaction(async (tx) => {
          let subject = null
          if (staging.subjectName) {
            subject = await tx.subject.findFirst({ where: { userId: ctx.user.id, name: staging.subjectName } })
            if (!subject) subject = await tx.subject.create({ data: { name: staging.subjectName, userId: ctx.user.id } })
          }

          let topic = null
          if (staging.topicName && subject) {
            topic = await tx.topic.findFirst({ where: { userId: ctx.user.id, subjectId: subject.id, name: staging.topicName } })
            if (!topic) topic = await tx.topic.create({ data: { name: staging.topicName, userId: ctx.user.id, subjectId: subject.id } })
          }

          const question = await tx.question.create({
            data: {
              text: staging.questionText,
              explanation: staging.explanation,
              hint: staging.hint,
              difficulty: staging.difficulty || 'MEDIUM',
              status: 'ACTIVE',
              userId: ctx.user.id,
              subjectId: subject?.id,
              topicId: topic?.id,
            },
          })

          const options = JSON.parse(staging.options || '[]')
          for (let i = 0; i < options.length; i++) {
            const label = options[i].label || String.fromCharCode(65 + i) // A, B, C, D...
            await tx.questionOption.create({ data: { questionId: question.id, label, text: options[i].text, position: i } })
          }

          // Only create answer record if correctLabel is set
          if (staging.correctLabel) {
            await tx.questionAnswer.create({ data: { questionId: question.id, correctLabel: staging.correctLabel!, explanation: staging.explanation } })
          }
          await tx.reviewItem.create({ data: { questionId: question.id, userId: ctx.user.id, status: 'NEW', nextReviewAt: new Date() } })
          await tx.importedQuestion.update({ where: { id: staging.id }, data: { status: 'approved', questionId: question.id } })
        })
      }

      const [approvedCount, pendingCount] = await Promise.all([
        prisma.importedQuestion.count({ where: { importId: input.importId, status: 'approved' } }),
        prisma.importedQuestion.count({ where: { importId: input.importId, status: 'pending' } }),
      ])
      await prisma.import.update({ where: { id: input.importId }, data: { approvedCount, pendingCount } })

      return { success: true, approvedCount: importRecord.importedQuestions.length }
    }),

  // List all imports for the user
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().min(1).max(100).default(20), cursor: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const imports = await prisma.import.findMany({
        where: { userId: ctx.user.id, ...(input.status && { status: input.status }) },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      })

      let nextCursor: string | undefined = undefined
      if (imports.length > input.limit) {
        const nextItem = imports.pop()
        nextCursor = nextItem?.id
      }

      return { imports, nextCursor }
    }),

  // Delete an import
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.import.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!importRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })

      await prisma.import.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // AI Generation: generate MCQs from topic/difficulty/count
  aiGenerate: protectedProcedure
    .input(z.object({
      subject: z.string().min(1).max(100),
      topic: z.string().min(1).max(100),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
      count: z.number().int().min(1).max(50).default(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const importRecord = await prisma.import.create({
        data: {
          userId: ctx.user.id,
          fileName: `AI: ${input.subject} - ${input.topic}`,
          fileSize: 0,
          fileType: 'ai_generated',
          sourceType: 'ai_generated',
          status: 'structuring',
          totalQuestions: 0,
          approvedCount: 0,
          rejectedCount: 0,
          pendingCount: 0,
        },
      })

      try {
        const { generateMCQs } = await import('@/lib/ai-studio/structuring')
        const { mcqs, warnings } = await generateMCQs(input.subject, input.topic, input.difficulty, input.count)

        if (mcqs.length === 0) {
          await prisma.import.update({
            where: { id: importRecord.id },
            data: {
              status: 'failed',
              errorReason: warnings[0] || 'AI generation returned no questions',
              completedAt: new Date(),
            },
          })
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: warnings[0] || 'AI generation returned no questions' })
        }

        for (const mcq of mcqs) {
          await prisma.importedQuestion.create({
            data: {
              importId: importRecord.id,
              questionText: mcq.question_text,
              options: JSON.stringify(mcq.options),
              correctLabel: mcq.correct_option,
              explanation: mcq.explanation,
              difficulty: input.difficulty,
              subjectName: input.subject,
              topicName: input.topic,
              status: 'pending',
              confidence: mcq.confidence,
              warnings: JSON.stringify(mcq.warnings),
            },
          })
        }

        await prisma.import.update({
          where: { id: importRecord.id },
          data: {
            status: 'pending_review',
            totalQuestions: mcqs.length,
            pendingCount: mcqs.length,
            progressStep: warnings.length ? `Ready for review (${warnings.length} warning(s))` : 'Ready for review',
            completedAt: new Date(),
          },
        })

        return { id: importRecord.id, count: mcqs.length }
      } catch (error) {
        await prisma.import.update({
          where: { id: importRecord.id },
          data: { status: 'failed', errorReason: error instanceof Error ? error.message : 'AI generation failed' },
        })
        throw error
      }
    }),
})
