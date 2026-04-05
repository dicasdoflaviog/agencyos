import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Bot, LogOut } from 'lucide-react'
import { ClientPortalLogout } from '@/components/client-portal/ClientPortalLogout'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id, name')
    .eq('id', user.id)
    .single()

  let clientName: string | null = null
  if (profile?.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', profile.client_id)
      .single()
    clientName = client?.name ?? null
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg-base)]">
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-4xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-accent)]">
              <Bot size={14} className="text-[var(--color-text-inverse)]" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">Agency OS</span>
          </div>

          {/* Client name + logout */}
          <div className="flex items-center gap-3">
            {clientName && (
              <>
                <span className="hidden text-xs text-[var(--color-text-muted)] sm:block">Portal de</span>
                <span className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)]">
                  {clientName}
                </span>
              </>
            )}
            <ClientPortalLogout />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-20 pb-12">
        {children}
      </main>
    </div>
  )
}
