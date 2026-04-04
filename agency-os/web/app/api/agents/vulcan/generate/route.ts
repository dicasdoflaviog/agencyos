import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// TODO: When Google Veo 2 API is available with your credentials:
// import { VertexAI } from '@google-cloud/aiplatform'
// const vertex = new VertexAI({ project: process.env.GOOGLE_CLOUD_PROJECT_ID, location: 'us-central1' })

const FORMAT_SIZES: Record<string, { width: number; height: number }> = {
  reels:   { width: 1080, height: 1920 },
  tiktok:  { width: 1080, height: 1920 },
  shorts:  { width: 1080, height: 1920 },
  banner:  { width: 1920, height: 1080 },
}

// Suppress unused variable warning — will be used when Veo 2 is plugged in
void FORMAT_SIZES

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    prompt: string
    format?: string
    duration_s?: number
    reference_url?: string
    client_id?: string
    job_id?: string
  }
  const { prompt, format = 'reels', duration_s = 15, reference_url, client_id, job_id } = body

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()

  const { data: videoJob, error } = await supabase.from('video_jobs').insert({
    client_id: client_id ?? null,
    job_id: job_id ?? null,
    workspace_id: profile?.workspace_id,
    format,
    prompt,
    reference_url: reference_url ?? null,
    duration_s,
    status: 'pending',
    created_by: user.id,
  }).select().single()

  if (error || !videoJob) return Response.json({ error: 'Failed to create job' }, { status: 500 })

  await supabase.from('video_jobs').update({ status: 'processing' }).eq('id', videoJob.id)

  // Stub: simulate async processing — replace with real Veo 2 API call when credentials are available.
  // In production: call Veo 2 API here, save veo_job_id, and handle completion via webhook.
  setTimeout(() => {
    void (async () => {
      const { createClient: stubClient } = await import('@/lib/supabase/server')
      const sc = await stubClient()
      await sc.from('video_jobs').update({
        status: 'done',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        completed_at: new Date().toISOString(),
      }).eq('id', videoJob.id)
    })()
  }, 8000)

  return Response.json({ job_id: videoJob.id, status: 'processing' })
}
