import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PostEditor } from '@/components/cms/PostEditor'

export default async function NewPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/clients/${id}/cms`} className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-3">
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para CMS
        </Link>
        <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Novo Post</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{client.name}</p>
      </div>
      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6">
        <PostEditor clientId={id} mode="create" />
      </div>
    </div>
  )
}
