import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CreativeStudioV2 } from '@/components/agents/CreativeStudioV2'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ prompt?: string; template?: string }>
}

export default async function CreativePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { prompt, template } = await searchParams
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  const userRole = (profile?.role ?? 'viewer') as 'admin' | 'collaborator' | 'viewer'

  return (
    <CreativeStudioV2
      clientId={id}
      userRole={userRole}
      initialPrompt={prompt ? decodeURIComponent(prompt) : undefined}
      initialTemplate={template ? decodeURIComponent(template) : undefined}
    />
  )
}
