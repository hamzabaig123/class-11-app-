import { prisma } from '@/lib/db'

interface RunImportPipelineOptions {
  buffer?: Buffer
  sourceType: string
  mimeType?: string
  fileName: string
  text?: string
  subject?: string
  topic?: string
}

// Runs extraction (if needed) + AI structuring for an import, and always
// leaves the Import row in a terminal, user-visible status — 'pending_review',
// 'needs_manual', or 'failed' — never silently stuck on 'extracting'/'structuring'.
export async function runImportPipeline(importId: string, opts: RunImportPipelineOptions) {
  try {
    let text = opts.text

    if (!text && opts.sourceType !== 'ai_generated') {
      if (!opts.buffer) {
        await prisma.import.update({
          where: { id: importId },
          data: {
            status: 'needs_manual',
            progressStep: 'No file or text provided',
            completedAt: new Date(),
          },
        })
        return
      }

      await prisma.import.update({
        where: { id: importId },
        data: { status: 'extracting', progressStep: 'Extracting text from file...' },
      })

      const { extractText } = await import('./extraction')
      const result = await extractText(opts.buffer, opts.sourceType, opts.fileName, opts.mimeType)
      text = result.text

      // Persist extracted text immediately so a retry can re-run structuring
      // without needing the original file (and without re-running OCR).
      await prisma.import.update({
        where: { id: importId },
        data: { extractedText: text || null },
      })

      if (!text || text.trim().length < 30) {
        await prisma.import.update({
          where: { id: importId },
          data: {
            status: 'needs_manual',
            errorReason: result.warnings[0] || 'No usable text was found in this file',
            progressStep: result.warnings[0] || 'No text extracted — try a clearer file or enter manually',
            completedAt: new Date(),
          },
        })
        return
      }
    }

    if (opts.sourceType === 'ai_generated') return

    await prisma.import.update({
      where: { id: importId },
      data: { status: 'structuring', progressStep: 'Structuring questions with AI...' },
    })

    const { structureText } = await import('./structuring')
    const { mcqs, warnings } = await structureText(text!, opts.subject, opts.topic)

    if (mcqs.length === 0) {
      await prisma.import.update({
        where: { id: importId },
        data: {
          status: 'failed',
          errorReason: warnings[0] || 'No questions could be identified in this content',
          progressStep: 'No questions extracted',
          completedAt: new Date(),
        },
      })
      return
    }

    for (const mcq of mcqs) {
      await prisma.importedQuestion.create({
        data: {
          importId,
          questionText: mcq.question_text,
          options: JSON.stringify(mcq.options),
          correctLabel: mcq.correct_option,
          explanation: mcq.explanation,
          difficulty: 'MEDIUM',
          subjectName: opts.subject,
          topicName: opts.topic,
          status: 'pending',
          confidence: mcq.confidence,
          warnings: JSON.stringify(mcq.warnings),
          rawSnippet: text!.slice(0, 500),
        },
      })
    }

    await prisma.import.update({
      where: { id: importId },
      data: {
        status: 'pending_review',
        totalQuestions: mcqs.length,
        pendingCount: mcqs.length,
        progressStep: warnings.length ? `Ready for review (${warnings.length} warning(s))` : 'Ready for review',
        completedAt: new Date(),
      },
    })
  } catch (error) {
    // Catch-all: guarantees the Import never gets stuck mid-pipeline and
    // the user always sees a clear reason instead of a silent hang.
    await prisma.import.update({
      where: { id: importId },
      data: {
        status: 'failed',
        errorReason: error instanceof Error ? error.message : 'Processing failed',
        errorMessage: error instanceof Error ? error.stack : undefined,
        completedAt: new Date(),
      },
    })
  }
}
