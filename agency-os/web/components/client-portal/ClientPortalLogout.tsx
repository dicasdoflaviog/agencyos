'use client'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ClientPortalLogout() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/client/login')
  }

  return (
    <button
      onClick={handleLogout}
      title="Sair"
      className="flex h-7 w-7 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-white/[0.06] hover:text-[#FAFAFA]"
    >
      <LogOut size={14} strokeWidth={2} />
    </button>
  )
}
