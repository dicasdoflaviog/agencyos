import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bot, LogOut } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/' as never)

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-accent)]">
            <Bot size={14} className="text-[var(--color-text-inverse)]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Agency OS</span>
          <span className="ml-2 rounded bg-[var(--color-accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">Admin</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Dashboard</Link>
          <Link href="/admin/workspaces" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Workspaces</Link>
          <Link href="/admin/analytics" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Analytics</Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <LogOut size={14} />
              Sair
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-[1280px] p-6">{children}</main>
    </div>
  )
}
