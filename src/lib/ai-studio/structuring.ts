import { z } from 'zod'

const MCQSchema = z.object({
  question_text: z.string().min(1).max(5000),
  options: z.array(
    z.object({
      key: z.enum(['A', 'B', 'C', 'D']),
      text: z.string().min(1).max(1000),
    })
  ).length(4),
  correct_option: z.enum(['A', 'B', 'C', 'D']).nullable(),
  explanation: z.string().max(5000).nullable(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string().max(500)),
})

const StructuringResultSchema = z.array(MCQSchema)

export type MCQ = z.infer<typeof MCQSchema>

const SYSTEM_PROMPT = `You are extracting multiple-choice questions from raw OCR/text-extracted content.
Return ONLY a JSON object with a "mcqs" array. Each element MUST match this schema exactly:
{
  "question_text": string,
  "options": [{ "key": "A"|"B"|"C"|"D", "text": string }],
  "correct_option": "A"|"B"|"C"|"D"|null,
  "explanation": string|null,
  "confidence": number (0-1),
  "warnings": string[]
}
If you cannot confidently identify the correct answer, set correct_option to null and add a warning — do NOT guess.
If a block of text is not a valid MCQ, omit it entirely rather than forcing it into the schema.`

const GENERATION_PROMPT = `Generate high-quality multiple-choice questions.
Return ONLY a JSON object with a "mcqs" array. Each element MUST match this schema exactly:
{
  "question_text": string,
  "options": [{ "key": "A"|"B"|"C"|"D", "text": string }],
  "correct_option": "A"|"B"|"C"|"D",
  "explanation": string,
  "confidence": number (0-1),
  "warnings": string[]
}
Generate factually accurate questions. Each question must have exactly 4 options with one correct answer.`

export async function structureText(
  text: string,
  subject?: string,
  topic?: string
): Promise<{ mcqs: MCQ[]; warnings: string[] }> {
  const warnings: string[] = []

  if (!text || text.trim().length < 30) {
    return { mcqs: [], warnings: ['Input text too short for extraction'] }
  }

  const chunks = chunkText(text, 3000)
  const allMcqs: MCQ[] = []

  const { executeAI } = await import('./client')

  for (const chunk of chunks) {
    try {
      const response = await executeAI({
        model: 'unused', // overridden in fallback
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract MCQs from the following text${subject ? ` (Subject: ${subject})` : ''}${topic ? ` (Topic: ${topic})` : ''}:\n\n${chunk}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        warnings.push('Empty response from LLM for a chunk')
        continue
      }

      try {
        const parsed = JSON.parse(content)
        const mcqs = StructuringResultSchema.parse(parsed.mcqs || parsed)
        allMcqs.push(...mcqs)
      } catch (parseError) {
        warnings.push(`Failed to parse LLM output: ${parseError instanceof Error ? parseError.message : 'unknown error'}`)
      }
    } catch (apiError: any) {
      warnings.push(`LLM API error: ${apiError?.message || 'unknown error'}`)
    }
  }

  return { mcqs: allMcqs, warnings }
}

export async function generateMCQs(
  subject: string,
  topic: string,
  difficulty: string,
  count: number
): Promise<{ mcqs: MCQ[]; warnings: string[] }> {
  const warnings: string[] = []
  
  const { executeAI } = await import('./client')

  try {
    const response = await executeAI({
      model: 'unused', // overridden in fallback
      messages: [
        { role: 'system', content: GENERATION_PROMPT },
        {
          role: 'user',
          content: `Generate ${count} multiple-choice questions about "${topic}" in "${subject}" at "${difficulty}" difficulty level. Include detailed explanations.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { mcqs: [], warnings: ['Empty response from LLM'] }
    }

    try {
      const parsed = JSON.parse(content)
      const mcqs = StructuringResultSchema.parse(parsed.mcqs || parsed)
      return { mcqs, warnings }
    } catch (parseError) {
      warnings.push(`Failed to parse LLM output: ${parseError instanceof Error ? parseError.message : 'unknown error'}`)
      return { mcqs: [], warnings }
    }
  } catch (apiError: any) {
    warnings.push(`LLM API error: ${apiError?.message || 'unknown error'}`)
    return { mcqs: [], warnings }
  }
}

function chunkText(text: string, maxChars: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let currentChunk = ''

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += ' ' + sentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}
