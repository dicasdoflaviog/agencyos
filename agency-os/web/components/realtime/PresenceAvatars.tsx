'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PresenceUser {
  user_id: string
  name: string
  avatar_url?: string
}

interface Props {
  channelName: string
  currentUser: { id: string; name: string; avatar_url?: string }
}

export function PresenceAvatars({ channelName, currentUser }: Props) {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(channelName)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        const present = Object.values(state).flat()
        setUsers(present)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            avatar_url: currentUser.avatar_url,
          })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [supabase, channelName, currentUser])

  const visible = users.slice(0, 3)
  const overflow = users.length - 3

  if (!users.length) return null

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {visible.map((u) => (
          <div
            key={u.user_id}
            title={u.name}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-xs font-medium text-[var(--color-text-primary)] overflow-hidden"
          >
            {u.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatar_url} alt={u.name} className="h-full w-full object-cover" />
            ) : (
              u.name.slice(0, 2).toUpperCase()
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-xs font-medium text-[var(--color-text-secondary)]">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-xs text-[var(--color-text-secondary)]">{users.length === 1 ? '1 visualizando' : `${users.length} visualizando`}</span>
    </div>
  )
}
