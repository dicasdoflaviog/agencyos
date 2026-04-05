'use client'

import { useEffect, useRef } from 'react'
import { X, Zap, Target, Lightbulb, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { AgentProfile, Squad } from '@/lib/team-data'

interface Props {
  agent: AgentProfile | null
  squad: Squad | null
  onClose: () => void
}

export function AgentProfileModal({ agent, squad, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!agent) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [agent, onClose])

  if (!agent || !squad) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 h-full w-full max-w-md flex flex-col bg-[var(--color-bg-base)] border-l border-[var(--color-border-default)] shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className={`flex-shrink-0 p-6 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-black to-transparent`}>
          <div className="flex items-start justify-between mb-4">
            <div
              className={`flex items-center justify-center w-16 h-16 rounded-2xl text-4xl border ${squad.colorBorder} ${squad.colorBg}`}
            >
              {agent.emoji}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <h2 className="text-2xl font-bold text-white mb-0.5">@{agent.name}</h2>
          <p className={`text-sm font-medium ${squad.colorText} mb-3`}>{agent.role}</p>

          {/* Squad badge */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${squad.colorBorder} ${squad.colorBg} ${squad.colorText}`}>
            {squad.name}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6">
          {/* Bio */}
          <div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{agent.bio}</p>
          </div>

          {/* Personality */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={13} className="text-[var(--color-text-muted)]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Personalidade</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {agent.personality.map(p => (
                <span key={p} className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] px-2.5 py-1 rounded-full">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Specialties */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} className={squad.colorText} />
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Especialidades</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {agent.specialties.map(s => (
                <span key={s} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${squad.colorBorder} ${squad.colorBg} ${squad.colorText}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={13} className="text-[var(--color-text-muted)]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Skills</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {agent.skills.map(s => (
                <div key={s} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] px-3 py-2 rounded-lg">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${squad.colorBg.replace('bg-', 'bg-').replace('/10', '')}`}
                    style={{ background: squad.color === 'amber' ? '#f59e0b' : squad.color === 'violet' ? '#8b5cf6' : squad.color === 'cyan' ? '#06b6d4' : squad.color === 'emerald' ? '#10b981' : '#f43f5e' }}
                  />
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* When to use */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight size={13} className="text-[var(--color-text-muted)]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Quando usar</span>
            </div>
            <ul className="space-y-2">
              {agent.whenToUse.map(w => (
                <li key={w} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-[var(--color-text-disabled)] flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0 p-5 border-t border-[var(--color-border-subtle)] bg-black/40">
          <Link
            href={`/oracle?agent=${agent.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl font-semibold text-sm text-black transition-opacity hover:opacity-90"
            style={{ background: squad.color === 'amber' ? '#f59e0b' : squad.color === 'violet' ? '#8b5cf6' : squad.color === 'cyan' ? '#06b6d4' : squad.color === 'emerald' ? '#10b981' : '#f43f5e' }}
          >
            <Zap size={15} />
            Acionar @{agent.name}
          </Link>
        </div>
      </div>
    </div>
  )
}
