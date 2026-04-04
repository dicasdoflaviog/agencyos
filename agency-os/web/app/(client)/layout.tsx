import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Bot } from 'lucide-react'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  return (
    <div className="min-h-screen bg-[#09090B]">
      <header className="h-14 border-b border-white/[0.07] bg-[#18181B] flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F59E0B]">
            <Bot size={14} className="text-[#0A0A0A]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-[#FAFAFA]">Agency OS — Portal do Cliente</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  )
}
