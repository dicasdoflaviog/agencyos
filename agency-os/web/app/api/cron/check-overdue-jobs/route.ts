import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: overdueJobs } = await supabase
    .from('jobs')
    .select('id, title, assigned_to, created_by')
    .lt('due_date', new Date().toISOString())
    .not('status', 'eq', 'done')
    .not('status', 'eq', 'cancelled')

  if (!overdueJobs?.length) return NextResponse.json({ processed: 0 })

  const notifications = overdueJobs.flatMap(job => {
    const notifyUser = job.assigned_to ?? job.created_by
    if (!notifyUser) return []
    return [{
      user_id: notifyUser,
      type: 'job_overdue',
      title: 'Job em atraso',
      body: `O job "${job.title}" está atrasado.`,
      link: `/jobs/${job.id}`,
      metadata: { job_id: job.id },
    }]
  })

  if (notifications.length) {
    await supabase.from('notifications').insert(notifications)
  }

  return NextResponse.json({ processed: overdueJobs.length })
}
