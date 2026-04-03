import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import TemplateEditForm from './TemplateEditForm'

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: template } = await supabase
    .from('job_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!template) notFound()

  return <TemplateEditForm template={template} />
}
