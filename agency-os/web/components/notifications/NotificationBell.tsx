'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  job_overdue: 'Job atrasado',
  approval_pending: 'Aprovação pendente',
  output_ready: 'Output pronto',
  pipeline_complete: 'Pipeline concluído',
  revision_requested: 'Revisão solicitada',
  stage_changed: 'Estágio atualizado',
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Click-outside fecha o dropdown sem overlay que bloquearia o sidebar
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, handleClickOutside])

  useEffect(() => {
    let userId: string | null = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      // Busca inicial
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data ?? [])

      // Canal Realtime — escuta INSERTs na tabela filtrados pelo user_id
      channelRef.current = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20))
          }
        )
        .subscribe()
    }

    init()

    // Cleanup: remove canal ao desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
        aria-label="Notificações"
      >
        <svg className="h-4 w-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Notificações</h3>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Sem notificações</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`flex gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] last:border-0 transition-colors ${
                      !n.read ? 'bg-violet-500/5' : 'hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    <div className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${!n.read ? 'bg-violet-400' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-primary)]">{n.title}</p>
                      {n.body && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{n.body}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-[var(--color-text-disabled)]">
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-disabled)]">
                          {new Date(n.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 text-xs text-violet-400 hover:text-violet-300 transition-colors self-center"
                      >
                        Ver →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
      )}
    </div>
  )
}
