import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: templates } = await supabase
    .from('job_templates')
    .select('*')
    .order('created_at', { ascending: false })

  const CONTENT_TYPE_LABELS: Record<string, string> = {
    post: 'Post', reel: 'Reel', stories: 'Stories',
    email: 'E-mail', video: 'Vídeo', blog: 'Blog', ad: 'Anúncio', other: 'Outro',
  }

  return (
    <div className="py-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-zinc-100">Templates de Jobs</h1>
          <p className="text-sm text-zinc-400 mt-1">Modelos pré-configurados para criar jobs mais rápido</p>
        </div>
        <Link
          href="/templates/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors"
        >
          + Novo template
        </Link>
      </div>

      {!templates?.length ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-12 text-center">
          <p className="text-zinc-400 font-medium">Nenhum template criado ainda</p>
          <p className="text-sm text-zinc-600 mt-1">
            Templates aceleram a criação de jobs com briefing e agentes pré-configurados
          </p>
          <Link
            href="/templates/new"
            className="mt-4 inline-flex items-center rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors"
          >
            Criar primeiro template
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-100">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-zinc-400 mt-0.5">{template.description}</p>
                  )}
                </div>
                {template.content_type && (
                  <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs text-violet-400">
                    {CONTENT_TYPE_LABELS[template.content_type] ?? template.content_type}
                  </span>
                )}
              </div>

              {template.default_agents?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {template.default_agents.map((agentId: string) => (
                    <span
                      key={agentId}
                      className="inline-flex items-center rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400"
                    >
                      {agentId.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Link
                  href={`/jobs/new?template=${template.id}`}
                  className="flex-1 text-center rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-inverse)] transition-colors"
                >
                  Usar template
                </Link>
                <Link
                  href={`/templates/${template.id}/edit`}
                  className="rounded-lg border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
