import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bot, LogOut } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/')

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      <header className="flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#18181B] px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F59E0B]">
            <Bot size={14} className="text-[#0A0A0A]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Agency OS</span>
          <span className="ml-2 rounded bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">Admin</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">Dashboard</Link>
          <Link href="/admin/workspaces" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">Workspaces</Link>
          <Link href="/admin/analytics" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">Analytics</Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
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
