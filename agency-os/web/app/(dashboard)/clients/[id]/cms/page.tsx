import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Plus } from 'lucide-react'
import { PostCard } from '@/components/cms/PostCard'

export default async function ClientCMSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: posts }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', id).single(),
    supabase.from('posts').select('*').eq('client_id', id).order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link
          href={`/clients/${id}/cms/new`}
          className="flex items-center gap-2 rounded bg-[#F59E0B] px-3 py-1.5 text-sm font-semibold text-[#09090B] hover:bg-[#D97706] transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Novo Post
        </Link>
      </div>

      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} clientId={id} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md border border-white/[0.07] bg-[#18181B] py-16 text-center">
          <p className="text-sm text-[#71717A] mb-3">Nenhum post criado ainda.</p>
          <Link
            href={`/clients/${id}/cms/new`}
            className="flex items-center gap-2 rounded bg-[#F59E0B] px-3 py-1.5 text-sm font-semibold text-[#09090B] hover:bg-[#D97706] transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            Criar primeiro post
          </Link>
        </div>
      )}
    </div>
  )
}
