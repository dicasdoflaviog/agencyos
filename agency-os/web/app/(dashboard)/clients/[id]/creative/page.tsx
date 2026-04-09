import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CreativeStudioV2 } from '@/components/agents/CreativeStudioV2'

export default async function CreativePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: profile }] = await Promise.all([
    supabase.from('clients').select('name').eq('id', id).single(),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return { data: null }
      return supabase.from('profiles').select('role').eq('id', user.id).single()
    }),
  ])

  if (!client) notFound()

  const userRole = (profile?.role ?? 'viewer') as 'admin' | 'collaborator' | 'viewer'

  return (
    <CreativeStudioV2
      clientId={id}
      userRole={userRole}
    />
  )
}
