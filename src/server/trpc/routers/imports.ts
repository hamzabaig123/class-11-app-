import { z } from 'zod'
import { router, protectedProcedure } from '../init'
import { db } from '@/lib/db'
import { TRPCError } from '@trpc/server'

export const importsRouter = router({
  // Get import status and summary
  getStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const importRecord = await db.import.findUnique({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          _count: {
            select: {
              importedQuestions: true,
            },
          },
        },
      })

      if (!importRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })
      }

      // Count questions by status
      const [pending, approved, rejected] = await Promise.all([
        db.importedQuestion.count({
          where: { importId: input.id, status: 'PENDING' },
        }),
        db.importedQuestion.count({
          where: { importId: input.id, status: 'APPROVED' },
        }),
        db.importedQuestion.count({
          where: { importId: input.id, status: 'REJECTED' },
        }),
      ])

      return {
        id: importRecord.id,
        fileName: importRecord.fileName,
        fileSize: importRecord.fileSize,
        fileType: importRecord.fileType,
        status: importRecord.status,
        totalQuestions: importRecord.totalQuestions,
        approvedCount: importRecord.approvedCount,
        rejectedCount: importRecord.rejectedCount,
        errorMessage: importRecord.errorMessage,
        createdAt: importRecord.createdAt,
        updatedAt: importRecord.updatedAt,
        completedAt: importRecord.completedAt,
        candidateCounts: {
          pending,
          approved,
          rejected,
        },
      }
    }),

  // Get list of questions for review
  reviewList: protectedProcedure
    .input(
      z.object({
        importId: z.string(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify the import belongs to the user
      const importRecord = await db.import.findUnique({
        where: { id: input.importId, userId: ctx.user.id },
      })

      if (!importRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })
      }

      const candidates = await db.importedQuestion.findMany({
        where: {
          importId: input.importId,
          status: input.status,
        },
        orderBy: { createdAt: 'asc' },
      })

      return { candidates }
    }),

  // Approve questions
  approve: protectedProcedure
    .input(
      z.object({
        importId: z.string(),
        questionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify the import belongs to the user
      const importRecord = await db.import.findUnique({
        where: { id: input.importId, userId: ctx.user.id },
      })

      if (!importRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })
      }

      // Update questions to APPROVED status
      await db.importedQuestion.updateMany({
        where: {
          id: { in: input.questionIds },
          importId: input.importId,
        },
        data: { status: 'APPROVED' },
      })

      // For each approved question, create an actual Question record
      const approvedQuestions = await db.importedQuestion.findMany({
        where: {
          id: { in: input.questionIds },
          importId: input.importId,
        },
      })

      for (const candidate of approvedQuestions) {
        // Find or create subject
        let subject = null
        if (candidate.subjectName) {
          subject = await db.subject.findFirst({
            where: {
              userId: ctx.user.id,
              name: candidate.subjectName,
            },
          })

          if (!subject) {
            subject = await db.subject.create({
              data: {
                name: candidate.subjectName,
                userId: ctx.user.id,
              },
            })
          }
        }

        // Find or create topic
        let topic = null
        if (candidate.topicName && subject) {
          topic = await db.topic.findFirst({
            where: {
              userId: ctx.user.id,
              subjectId: subject.id,
              name: candidate.topicName,
            },
          })

          if (!topic) {
            topic = await db.topic.create({
              data: {
                name: candidate.topicName,
                userId: ctx.user.id,
                subjectId: subject.id,
              },
            })
          }
        }

        // Create the question
        const question = await db.question.create({
          data: {
            text: candidate.questionText,
            explanation: candidate.explanation,
            hint: candidate.hint,
            difficulty: candidate.difficulty || 'MEDIUM',
            status: 'ACTIVE',
            userId: ctx.user.id,
            subjectId: subject?.id,
            topicId: topic?.id,
          },
        })

        // Parse and create options
        const options = JSON.parse(
          typeof candidate.options === 'string' ? candidate.options : '[]'
        )

        for (let i = 0; i < options.length; i++) {
          await db.questionOption.create({
            data: {
              questionId: question.id,
              label: options[i].label,
              text: options[i].text,
              position: i,
            },
          })
        }

        // Create the answer
        await db.questionAnswer.create({
          data: {
            questionId: question.id,
            correctLabel: candidate.correctLabel,
            explanation: candidate.explanation,
          },
        })

        // Link the imported question to the created question
        await db.importedQuestion.update({
          where: { id: candidate.id },
          data: { questionId: question.id },
        })

        // Parse and create tags
        const tags = JSON.parse(
          typeof candidate.tags === 'string' ? candidate.tags : '[]'
        )
        for (const tagName of tags) {
          await db.questionTag.create({
            data: {
              questionId: question.id,
              name: tagName,
            },
          })
        }
      }

      // Update import counts
      const approvedCount = await db.importedQuestion.count({
        where: { importId: input.importId, status: 'APPROVED' },
      })

      await db.import.update({
        where: { id: input.importId },
        data: { approvedCount },
      })

      return { success: true, approvedCount: input.questionIds.length }
    }),

  // Reject questions
  reject: protectedProcedure
    .input(
      z.object({
        importId: z.string(),
        questionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify the import belongs to the user
      const importRecord = await db.import.findUnique({
        where: { id: input.importId, userId: ctx.user.id },
      })

      if (!importRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })
      }

      // Update questions to REJECTED status
      await db.importedQuestion.updateMany({
        where: {
          id: { in: input.questionIds },
          importId: input.importId,
        },
        data: { status: 'REJECTED' },
      })

      // Update import counts
      const rejectedCount = await db.importedQuestion.count({
        where: { importId: input.importId, status: 'REJECTED' },
      })

      await db.import.update({
        where: { id: input.importId },
        data: { rejectedCount },
      })

      return { success: true, rejectedCount: input.questionIds.length }
    }),

  // List all imports for the user
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const imports = await db.import.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      })

      let nextCursor: string | undefined = undefined
      if (imports.length > input.limit) {
        const nextItem = imports.pop()
        nextCursor = nextItem?.id
      }

      return {
        imports,
        nextCursor,
      }
    }),

  // Delete an import and all its candidates
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Verify the import belongs to the user
      const importRecord = await db.import.findUnique({
        where: { id: input.id, userId: ctx.user.id },
      })

      if (!importRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Import not found' })
      }

      // Delete the import (cascade will handle importedQuestions)
      await db.import.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})
