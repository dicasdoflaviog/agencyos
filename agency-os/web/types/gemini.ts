export interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export interface GeminiStreamChunk {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

export interface GeminiImagePart {
  inlineData: { mimeType: string; data: string }
}

export interface GeminiTextPart {
  text: string
}

export type GeminiPart = GeminiImagePart | GeminiTextPart

export interface GeminiResponsePart {
  inlineData?: { mimeType: string; data: string }
  text?: string
}

export interface GeminiResponse {
  candidates?: Array<{
    content: { parts: GeminiResponsePart[] }
  }>
}

/** Alias used in older files — same shape as GeminiResponse */
export type GeminiContentResponse = GeminiResponse
