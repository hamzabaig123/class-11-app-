import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { runImportPipeline } from '@/lib/ai-studio/pipeline'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const EXT_TO_SOURCE_TYPE: Record<string, string> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  bmp: 'image',
  webp: 'image',
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be logged in to upload files' }, { status: 401 })
  }

  // Guard against the same stale-session issue as protectedProcedure: make
  // sure this user id still exists before writing anything referencing it.
  const dbUser = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { id: true } })
  if (!dbUser) {
    return NextResponse.json({ error: 'Your session is no longer valid. Please sign in again.' }, { status: 401 })
  }
  const userId = dbUser.id

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload — expected multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'The selected file is empty' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds the 50MB limit' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const sourceType = EXT_TO_SOURCE_TYPE[ext]
  if (!sourceType) {
    return NextResponse.json(
      { error: `Unsupported file type ".${ext}". Supported: PDF, DOCX, TXT, PNG, JPG, GIF, BMP, WEBP` },
      { status: 400 }
    )
  }

  const subject = (formData.get('subject') as string) || undefined
  const topic = (formData.get('topic') as string) || undefined

  const buffer = Buffer.from(await file.arrayBuffer())

  const importRecord = await prisma.import.create({
    data: {
      userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || ext,
      sourceType,
      status: 'queued',
    },
  })

  // Kick off processing without blocking the response; the frontend polls
  // imports.getStatus for progress. Any failure is guaranteed to resolve
  // the Import to status 'failed' with a readable reason (see pipeline.ts).
  runImportPipeline(importRecord.id, {
    buffer,
    sourceType,
    mimeType: file.type || undefined,
    fileName: file.name,
    subject,
    topic,
  }).catch(() => {
    // runImportPipeline already handles its own errors internally; this
    // catch only guards against a truly unexpected throw outside of it.
  })

  return NextResponse.json({ id: importRecord.id })
}

// Route handlers stream the body — no bodyParser size cap to raise here,
// but keep an explicit max duration so large OCR/AI calls don't get killed early.
export const maxDuration = 120
