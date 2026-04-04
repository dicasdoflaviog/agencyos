'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { RoleBadge } from './RoleBadge'

interface WorkspaceMember {
  id: string
  user_id: string | null
  role: string
  invited_by: string | null
  accepted_at: string | null
  created_at: string
  profile?: { id: string; name: string; email: string; avatar_url: string | null }
}

interface InviteToken {
  id: string
  email: string
  role: string
  token: string
  invited_by: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

interface MemberListProps {
  members: WorkspaceMember[]
  pendingInvites: InviteToken[]
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="h-7 w-7 rounded-full object-cover" />
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#27272A] text-xs font-semibold text-[#FAFAFA]">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function MemberList({ members, pendingInvites }: MemberListProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(memberId: string) {
    setRemoving(memberId)
    try {
      const res = await fetch(`/api/team/${memberId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Erro ao remover membro')
        return
      }
      toast.success('Membro removido')
      router.refresh()
    } catch {
      toast.error('Erro ao remover membro')
    } finally {
      setRemoving(null)
    }
  }

  const hasRows = members.length > 0 || pendingInvites.length > 0

  return (
    <div className="rounded-md border border-white/[0.07] bg-[#18181B] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.07] bg-[#F59E0B]/5">
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#F59E0B]">
              Nome / E-mail
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#F59E0B]">
              Papel
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#F59E0B]">
              Status
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#F59E0B]">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {!hasRows && (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-xs text-[#A1A1AA]">
                Nenhum membro na equipe ainda.
              </td>
            </tr>
          )}

          {members.map((member) => (
            <tr key={member.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={member.profile?.name ?? member.profile?.email ?? '??'}
                    avatarUrl={member.profile?.avatar_url ?? null}
                  />
                  <div>
                    <p className="text-sm font-medium text-[#FAFAFA]">
                      {member.profile?.name ?? '—'}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">{member.profile?.email ?? '—'}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <RoleBadge role={member.role} />
              </td>
              <td className="px-5 py-3.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#22C55E]">
                  <CheckCircle2 size={13} />
                  Ativo
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                <button
                  onClick={() => handleRemove(member.id)}
                  disabled={removing === member.id}
                  className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:bg-[#EF4444]/10 hover:text-[#EF4444] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 size={13} />
                  {removing === member.id ? 'Removendo…' : 'Remover'}
                </button>
              </td>
            </tr>
          ))}

          {pendingInvites.map((invite) => (
            <tr key={invite.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors opacity-70">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#27272A] text-xs font-semibold text-[#A1A1AA]">
                    {invite.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-[#A1A1AA]">{invite.email}</p>
                    <p className="text-xs text-[#71717A]">Convite pendente</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <RoleBadge role={invite.role} />
              </td>
              <td className="px-5 py-3.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                  <Clock size={13} />
                  Pendente
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                <span className="text-xs text-[#71717A]">—</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
