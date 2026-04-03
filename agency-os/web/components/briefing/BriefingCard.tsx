import Link from 'next/link'
import type { JobBriefing } from '@/types/database'
import { Button } from '@/components/ui/button'

const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: 'Post',
  reel: 'Reel',
  stories: 'Stories',
  email: 'E-mail',
  video: 'Vídeo',
  blog: 'Blog',
  ad: 'Anúncio',
  other: 'Outro',
}

type Props = {
  briefing: JobBriefing
  jobId: string
}

export default function BriefingCard({ briefing, jobId }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Briefing</h3>
        <Link href={`/jobs/${jobId}/briefing`}>
          <Button variant="ghost" size="sm" className="text-xs text-violet-400 hover:text-violet-300">
            Editar
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-400 border border-violet-500/20">
          {CONTENT_TYPE_LABELS[briefing.content_type] ?? briefing.content_type}
        </span>
        {briefing.tone && (
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
            {briefing.tone}
          </span>
        )}
      </div>

      <div className="space-y-3 text-sm">
        {briefing.objective && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Objetivo</p>
            <p className="text-zinc-300">{briefing.objective}</p>
          </div>
        )}
        {briefing.target_audience && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Público-alvo</p>
            <p className="text-zinc-300">{briefing.target_audience}</p>
          </div>
        )}
        {briefing.key_message && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Mensagem principal</p>
            <p className="text-zinc-300 font-medium">"{briefing.key_message}"</p>
          </div>
        )}
        {briefing.restrictions && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Restrições</p>
            <p className="text-zinc-400">{briefing.restrictions}</p>
          </div>
        )}
        {briefing.reference_urls?.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-1">Referências</p>
            <div className="space-y-0.5">
              {briefing.reference_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-violet-400 hover:underline truncate"
                >
                  {url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
