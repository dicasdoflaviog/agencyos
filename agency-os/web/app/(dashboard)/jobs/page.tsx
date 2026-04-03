import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { JobKanban } from '@/components/jobs/JobKanban'
import { Button } from '@/components/ui/button'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name, logo_url)')
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Jobs</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">{jobs?.length ?? 0} job{(jobs?.length ?? 0) !== 1 ? 's' : ''} ativos</p>
        </div>
        <Button asChild className="bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706] cursor-pointer">
          <Link href="/jobs/new">
            <Plus size={15} strokeWidth={2.5} className="mr-1.5" />
            Novo Job
          </Link>
        </Button>
      </div>
      <JobKanban jobs={jobs ?? []} />
    </div>
  )
}
