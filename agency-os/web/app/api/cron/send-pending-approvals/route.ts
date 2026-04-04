import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: pendingOutputs } = await supabase
    .from('job_outputs')
    .select('id, job_id, jobs(title, assigned_to, created_by)')
    .eq('approval_stage', 'client_review')
    .lt('updated_at', fortyEightHoursAgo)

  if (!pendingOutputs?.length) return NextResponse.json({ reminders_sent: 0 })

  const notifications = pendingOutputs.flatMap(output => {
    const jobRaw = output.jobs
    const job = (Array.isArray(jobRaw) ? jobRaw[0] : jobRaw) as { title: string; assigned_to: string | null; created_by: string | null } | null
    const notifyUser = job?.assigned_to ?? job?.created_by
    if (!notifyUser) return []
    return [{
      user_id: notifyUser,
      type: 'approval_pending',
      title: 'Aprovação pendente há mais de 48h',
      body: `O output do job "${job?.title ?? 'Sem título'}" aguarda aprovação do cliente.`,
      link: `/jobs/${output.job_id}`,
      metadata: { output_id: output.id },
    }]
  })

  if (notifications.length) {
    await supabase.from('notifications').insert(notifications)
  }

  return NextResponse.json({ reminders_sent: pendingOutputs.length })
}
