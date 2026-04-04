import Link from 'next/link'
import { FileText, Calendar } from 'lucide-react'
import { PostStatusBadge } from './PostStatusBadge'
import type { Post } from '@/types/database'

interface Props {
  post: Post
  clientId: string
}

export function PostCard({ post, clientId }: Props) {
  const date = post.published_at ?? post.created_at
  return (
    <Link
      href={`/clients/${clientId}/cms/${post.id}/edit`}
      className="group flex flex-col gap-3 rounded-md border border-white/[0.07] bg-[#18181B] p-4 hover:border-white/[0.15] transition-colors"
    >
      {post.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_url} alt={post.title} className="w-full h-32 object-cover rounded" />
      )}
      {!post.cover_url && (
        <div className="flex items-center justify-center w-full h-32 rounded bg-[#27272A]">
          <FileText size={24} className="text-[#71717A]" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#FAFAFA] group-hover:text-[#F59E0B] transition-colors line-clamp-2">
          {post.title}
        </h3>
        <PostStatusBadge status={post.status} />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
        <Calendar size={11} />
        {new Date(date).toLocaleDateString('pt-BR')}
      </div>
    </Link>
  )
}
