/**
 * Gemini text-embedding-004 — 768 dimensions
 * Replaces OpenAI text-embedding-3-small (1536 dims) — sem custo no Google AI Studio
 */

interface EmbedResponse {
  embedding: { values: number[] }
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      },
    )

    if (!res.ok) return null
    const data = (await res.json()) as EmbedResponse
    return data.embedding.values
  } catch {
    return null
  }
}
