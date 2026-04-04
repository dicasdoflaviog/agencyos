'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import type { Post } from '@/types/database'

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

interface PostEditorProps {
  clientId: string
  initialData?: Post
  mode: 'create' | 'edit'
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function PostEditor({ clientId, initialData, mode }: PostEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [content, setContent] = useState<string>(initialData?.content ?? '')
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_url ?? '')
  const [status, setStatus] = useState<Post['status']>(initialData?.status ?? 'draft')

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (mode === 'create') setSlug(slugify(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Título é obrigatório')
      return
    }
    setLoading(true)
    try {
      const payload = {
        title,
        slug: slug || slugify(title),
        content,
        cover_url: coverUrl || null,
        status,
        client_id: clientId,
      }

      const url = mode === 'create' ? '/api/posts' : `/api/posts/${initialData!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao salvar')
      }

      toast.success(mode === 'create' ? 'Post criado com sucesso!' : 'Post atualizado!')
      router.push(`/clients/${clientId}/cms`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
          Título
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Título do post..."
          className="w-full rounded-md border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug-do-post"
          className="w-full rounded-md border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
        />
      </div>

      {/* Content */}
      <div className="space-y-1.5" data-color-mode="dark">
        <label className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
          Conteúdo
        </label>
        <MDEditor
          value={content}
          onChange={(val) => setContent(val ?? '')}
          height={400}
          preview="edit"
        />
      </div>

      {/* Cover URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
          URL da Capa
        </label>
        <input
          type="url"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-md border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
        />
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="Preview da capa" className="mt-2 h-32 rounded object-cover" />
        )}
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Post['status'])}
          className="w-full rounded-md border border-white/[0.07] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
        >
          <option value="draft">Rascunho</option>
          <option value="review">Revisão</option>
          <option value="published">Publicado</option>
        </select>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-md bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#09090B] transition-colors hover:bg-[#D97706] disabled:opacity-60"
        >
          {loading ? 'Salvando...' : mode === 'create' ? 'Criar Post' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
