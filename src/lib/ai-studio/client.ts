import OpenAI from 'openai'

let _googleClient: OpenAI | null = null

export function getGoogleClient(): OpenAI {
  if (!_googleClient) {
    _googleClient = new OpenAI({
      apiKey: process.env.GOOGLE_API_KEY || '',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    })
  }
  return _googleClient
}

// Google AI Studio models
export const TEXT_MODEL = 'gemini-2.5-flash'
export const VISION_MODEL = 'gemini-2.5-flash'

// Execute AI request via Google AI Studio
export async function executeAI(
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
) {
  const googleClient = getGoogleClient()
  return await googleClient.chat.completions.create({
    ...params,
    model: TEXT_MODEL,
  })
}

