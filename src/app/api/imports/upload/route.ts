import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractText } from '@/lib/ai-studio/extraction'
import { structureText } from '@/lib/ai-studio/structuring'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    const maxSize = parseInt(process.env.IMPORT_MAX_FILE_BYTES || '25000000')
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // Determine source type
    const fileName = file.name
    const mimeType = file.type
    const ext = fileName.split('.').pop()?.toLowerCase()

    let sourceType: string
    if (mimeType === 'application/pdf' || ext === 'pdf') sourceType = 'pdf'
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') sourceType = 'docx'
    else if (mimeType === 'text/plain' || ext === 'txt') sourceType = 'txt'
    else if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext || '')) sourceType = 'image'
    else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    // Convert to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create import record
    const importRecord = await prisma.import.create({
      data: {
        userId: session.user.id,
        fileName,
        fileSize: file.size,
        fileType: mimeType,
        sourceType,
        status: 'processing',
      },
    })

    try {
      // Extract text
      const extraction = await extractText(buffer, sourceType, fileName)

      // Structure text into MCQs
      const { mcqs, warnings } = await structureText(
        extraction.text,
        formData.get('subject') as string || undefined,
        formData.get('topic') as string || undefined
      )

      // Insert MCQs into staging
      for (const mcq of mcqs) {
        await prisma.importedQuestion.create({
          data: {
            importId: importRecord.id,
            questionText: mcq.question_text,
            options: JSON.stringify(mcq.options),
            correctLabel: mcq.correct_option,
            explanation: mcq.explanation,
            subjectName: formData.get('subject') as string || undefined,
            topicName: formData.get('topic') as string || undefined,
            status: 'pending',
            confidence: mcq.confidence,
            warnings: JSON.stringify(mcq.warnings),
            rawSnippet: extraction.text.slice(0, 1000),
          },
        })
      }

      // Update import status
      const pendingCount = mcqs.length
      await prisma.import.update({
        where: { id: importRecord.id },
        data: {
          status: 'pending_review',
          totalQuestions: pendingCount,
          pendingCount,
          progressStep: 'Ready for review',
          completedAt: new Date(),
        },
      })

      return NextResponse.json({
        importId: importRecord.id,
        status: 'pending_review',
        totalQuestions: pendingCount,
      })
    } catch (error) {
      await prisma.import.update({
        where: { id: importRecord.id },
        data: {
          status: 'failed',
          errorReason: error instanceof Error ? error.message : 'Processing failed',
          errorMessage: error instanceof Error ? error.stack : undefined,
        },
      })

      return NextResponse.json({
        importId: importRecord.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed',
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
