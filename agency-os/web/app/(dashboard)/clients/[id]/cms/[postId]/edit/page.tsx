import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PostEditor } from '@/components/cms/PostEditor'

export default async function EditPostPage({ params }: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: post }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', id).single(),
    supabase.from('posts').select('*').eq('id', postId).eq('client_id', id).single(),
  ])

  if (!client || !post) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/clients/${id}/cms`} className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors mb-3">
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para CMS
        </Link>
        <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Editar Post</h2>
        <p className="text-sm text-[#A1A1AA] mt-0.5">{client.name} — {post.title}</p>
      </div>
      <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-6">
        <PostEditor clientId={id} initialData={post} mode="edit" />
      </div>
    </div>
  )
}
