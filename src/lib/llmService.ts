import OpenAI from 'openai'
import { z } from 'zod'

const MCQExplanationSchema = z.object({
  explanation: z.string(),
  wrongOptionNotes: z.record(z.string()),
})

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'MCQ Master',
      },
    })
  }
  return _client
}

export async function callLLM(req: {
  purpose?: string
  prompt: string
  system?: string
  userId?: string
  schema?: z.ZodSchema
  json?: boolean
  temperature?: number
  max_tokens?: number
}): Promise<{ success: boolean; error?: string; data?: any; raw?: string }> {
  const model = process.env.OPENAI_MODEL || 'google/gemini-2.0-flash-001'
  
  try {
    const messages: { role: 'system' | 'user'; content: string }[] = []
    
    if (req.system) {
      messages.push({ role: 'system', content: req.system })
    } else {
      messages.push({ role: 'system', content: 'You are an educational AI assistant. Respond with valid JSON only.' })
    }
    
    messages.push({ role: 'user', content: req.prompt })

    const response = await getClient().chat.completions.create({
      model,
      messages,
      temperature: req.temperature ?? 0.1,
      response_format: req.json || req.schema ? { type: 'json_object' } : undefined,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { success: false, error: 'Empty response from LLM' }
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content)
      
      // Validate against schema if provided
      if (req.schema) {
        const result = req.schema.safeParse(parsed)
        if (!result.success) {
          return { success: false, error: `Schema validation failed: ${result.error.issues.map(i => i.message).join(', ')}`, raw: content }
        }
        return { success: true, data: result.data, raw: content }
      }
      
      return { success: true, data: parsed, raw: content }
    } catch (parseError) {
      return { success: false, error: 'Failed to parse LLM response as JSON', raw: content }
    }
  } catch (apiError: any) {
    return { success: false, error: apiError?.message || 'LLM API error' }
  }
}

export { MCQExplanationSchema }
