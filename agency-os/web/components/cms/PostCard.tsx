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
      className="group flex flex-col gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 hover:border-[var(--color-border-strong)] transition-colors"
    >
      {post.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_url} alt={post.title} className="w-full h-32 object-cover rounded" />
      )}
      {!post.cover_url && (
        <div className="flex items-center justify-center w-full h-32 rounded bg-[var(--color-bg-elevated)]">
          <FileText size={24} className="text-[var(--color-text-muted)]" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
          {post.title}
        </h3>
        <PostStatusBadge status={post.status} />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
        <Calendar size={11} />
        {new Date(date).toLocaleDateString('pt-BR')}
      </div>
    </Link>
  )
}
