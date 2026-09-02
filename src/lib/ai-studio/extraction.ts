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
  fileName: string
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
      const result = await extractImage(buffer, fileName)
      return result
    }
    case 'ai_generated': {
      return { text: '', warnings: [] }
    }
    default:
      throw new Error(`Unsupported source type: ${sourceType}`)
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const warnings: string[] = []
  let parser: PDFParse | null = null

  try {
    parser = new PDFParse({ data: buffer })
    const data = await parser.getText()

    const text = data.text || ''
    const pageCount = data.numpages

    const avgCharsPerPage = text.length / (pageCount || 1)
    if (avgCharsPerPage < 50) {
      warnings.push(
        `Low text density (${Math.round(avgCharsPerPage)} chars/page). This may be a scanned PDF requiring OCR.`
      )
    }

    return { text, pageCount, warnings }
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  } finally {
    if (parser) {
      parser.destroy()
    }
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

async function extractImage(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
  const warnings: string[] = []

  // Convert buffer to base64 data URL
  const mimeType = getMimeType(fileName)
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  try {
    const text = await performOCR(dataUrl)
    if (text.trim().length < 30) {
      warnings.push('OCR produced very little text. The image may be unclear or contain no text.')
    }
    return { text, warnings }
  } catch (error) {
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'bmp':
      return 'image/bmp'
    default:
      return 'image/png'
  }
}

async function performOCR(dataUrl: string): Promise<string> {
  const OpenAI = (await import('openai')).default

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'MCQ Master',
    },
  })

  const model = process.env.OPENAI_VISION_MODEL || 'google/gemini-2.0-flash-001'

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Transcribe all visible text in this image exactly as it appears. Preserve question numbering (e.g. "Q1.", "1.", "(1)"), option labels (e.g. "A.", "(A)", "A)"), and paragraph structure. If a region is unreadable, mark it as [unreadable]. Return only the transcription, no explanations.`,
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
    temperature: 0.1,
  })

  return response.choices[0]?.message?.content || ''
}
