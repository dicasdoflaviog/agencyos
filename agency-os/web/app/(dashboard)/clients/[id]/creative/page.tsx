import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CreativeStudioV2 } from '@/components/agents/CreativeStudioV2'

export default async function CreativePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    />
  )
}
