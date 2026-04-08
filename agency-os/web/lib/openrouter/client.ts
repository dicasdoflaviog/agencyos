import 'server-only'
import OpenAI from 'openai'

export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? 'missing-key',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://agencyos-cyan.vercel.app',
    'X-Title': 'Agency OS',
  },
})
