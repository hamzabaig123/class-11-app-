import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

export interface ExtractionResult {
  text: string
  pageCount?: number
  warnings: string[]
}

export async function extractText(
  buffer: Buffer,
  sourceType: string,
  fileName: string,
  mimeType?: string
): Promise<ExtractionResult> {
  const warnings: string[] = []

  switch (sourceType) {
    case 'pdf': {
      const result = await extractPdf(buffer)
      return result
    }
    case 'docx': {
      const result = await extractDocx(buffer)
      return result
    }
    case 'txt': {
      const text = buffer.toString('utf-8')
      if (text.trim().length < 50) {
        warnings.push('File contains very little text')
      }
      return { text, warnings }
    }
    case 'image': {
      const result = await extractImage(buffer, mimeType || 'image/png')
      return result
    }
    case 'ai_generated': {
      // No extraction needed - AI generation goes straight to structuring
      return { text: '', warnings: [] }
    }
    default:
      throw new Error(`Unsupported source type: ${sourceType}`)
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const warnings: string[] = []
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    const text = result.text || ''
    const pageCount = result.total

    // Heuristic: if very little text per page, likely scanned
    const avgCharsPerPage = text.length / (pageCount || 1)
    if (avgCharsPerPage < 50) {
      warnings.push(
        `Low text density (${Math.round(avgCharsPerPage)} chars/page). This may be a scanned/image-only PDF — try re-uploading it as an image instead so OCR can be used.`
      )
    }

    return { text, pageCount, warnings }
  } finally {
    await parser.destroy()
  }
}

const OCR_PROMPT = `Transcribe ALL text visible in this image exactly as written, including every
multiple-choice question, its options, and any answer key or explanation shown. Preserve
question numbering and option labels (A/B/C/D etc). Output plain text only — no commentary,
no markdown formatting, just the transcribed content.`

async function extractImage(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  const warnings: string[] = []

  try {
    const base64 = buffer.toString('base64')
    const { executeAI } = await import('./client')
    const response = await executeAI({
      model: 'unused', // overridden in fallback
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ] as any,
        },
      ],
      temperature: 0,
    })

    const text = response.choices[0]?.message?.content || ''
    if (text.trim().length < 20) {
      warnings.push('Little to no text detected in the image — is it clear and legible?')
    }
    return { text, warnings }
  } catch (error) {
    throw new Error(
      `Image OCR failed: ${error instanceof Error ? error.message : 'unknown error'}`
    )
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  const warnings: string[] = []
  const result = await mammoth.extractRawText({ buffer })

  if (result.messages.length > 0) {
    const errors = result.messages.filter((m) => m.type === 'error')
    if (errors.length > 0) {
      warnings.push(`${errors.length} conversion issues detected`)
    }
  }

  return { text: result.value, warnings }
}
