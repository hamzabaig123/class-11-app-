import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getAIClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY is not set. Add it to your .env file to enable AI extraction/structuring.'
      )
    }
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'MCQ Master',
      },
    })
  }
  return _client
}

// Text model used for structuring MCQs out of plain text.
export const TEXT_MODEL = process.env.OPENAI_MODEL || 'google/gemini-2.0-flash-001'

// Vision-capable model used for OCR/transcription of images.
// Defaults to the same model since Gemini Flash is multimodal.
export const VISION_MODEL = process.env.OPENAI_VISION_MODEL || TEXT_MODEL
