import pdf from 'pdf-parse'
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
      return {
        text: '',
        warnings: ['Image/OCR extraction not yet implemented'],
      }
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
  const data = await pdf(buffer)

  const text = data.text || ''
  const pageCount = data.numpages

  const avgCharsPerPage = text.length / (pageCount || 1)
  if (avgCharsPerPage < 50) {
    warnings.push(
      `Low text density (${Math.round(avgCharsPerPage)} chars/page). This may be a scanned PDF requiring OCR.`
    )
  }

  return { text, pageCount, warnings }
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
