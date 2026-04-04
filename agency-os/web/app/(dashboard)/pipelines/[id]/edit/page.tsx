import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PipelineEditForm from './PipelineEditForm'

export default async function EditPipelinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pipeline } = await supabase
    .from('agent_pipelines')
    .select('*')
    .eq('id', id)
    .single()

  if (!pipeline) notFound()

  return <PipelineEditForm pipeline={pipeline} />
}
