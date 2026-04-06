import { openrouter } from '@/lib/openrouter/client'

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENROUTER_API_KEY) return null

  try {
    const res = await openrouter.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: text,
    })
    return res.data[0]?.embedding ?? null
  } catch {
    return null
  }
}
