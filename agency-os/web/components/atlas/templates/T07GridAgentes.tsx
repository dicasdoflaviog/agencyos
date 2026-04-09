'use client'
// T07 — Grid Escuro + Agentes (Glassmorphism 2×2 + hero ícone central)
// Grid 2×2 glassmorphism → ícone hero central → headline overlay no fundo
// Uso: showcase de agentes/times IA, posts de equipe, AI stack

import React from 'react'
import { T, sc, canvasBase } from './tokens'

export interface T07Agent {
  emoji: string
  name: string
  role: string
  statusColor?: string   // 'green', 'amber', 'blue'
}

export interface T07Props {
  title: string           // headline no fundo (ex: "Conheça os Agentes")
  subtitle: string
  agents?: T07Agent[]     // 4 cards no grid 2×2
  heroEmoji?: string      // ícone central (default ⚡)
  brandName?: string
  tags?: string[]
  accentColor?: string    // token do cliente
  size?: number
}

const DEFAULT_AGENTS: T07Agent[] = [
  { emoji: '✍️', name: 'VERA',    role: 'Copywriter',  statusColor: 'green' },
  { emoji: '🎨', name: 'ATLAS',   role: 'Designer',    statusColor: 'amber' },
  { emoji: '🔗', name: 'NEXUS',   role: 'Traffic',     statusColor: 'green' },
  { emoji: '🧠', name: 'ORACLE',  role: 'Strategist',  statusColor: 'blue' },
]

const STATUS_COLORS: Record<string, string> = {
  green: '#10B981',
  amber: '#F59E0B',
  blue: '#3B82F6',
}

export function T07GridAgentes({
  title,
  subtitle,
  agents = DEFAULT_AGENTS,
  heroEmoji = '⚡',
  brandName = 'Agency OS',
  tags = [],
  accentColor = '#F59E0B',
  size = 540,
}: T07Props) {
  const s = (px: number) => sc(px, size)

  return (
    <div style={{
      ...canvasBase(size),
      background: T.bgBase,
    }}>
      {/* Headline no background */}
      <div style={{
        position: 'absolute', bottom: s(28), left: s(28), right: s(28),
        fontSize: s(30), fontWeight: 800,
        letterSpacing: '-0.02em', lineHeight: 1.15,
        color: T.textPrimary,
        zIndex: 1,
      }}>
        {title}
      </div>

      {/* Grid 2×2 glassmorphism */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: s(3),
        zIndex: 2,
      }}>
        {agents.slice(0, 4).map((agent, i) => {
          const statusColor = agent.statusColor ? (STATUS_COLORS[agent.statusColor] || STATUS_COLORS.green) : STATUS_COLORS.green
          return (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              border: `1px solid rgba(255,255,255,0.08)`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: s(8), padding: s(20),
            }}>
              {/* Avatar */}
              <div style={{
                width: s(52), height: s(52),
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: s(24),
                boxShadow: `0 0 0 4px ${accentColor}22`,
              }}>
                {agent.emoji}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: s(14), fontWeight: 700, color: T.textPrimary }}>{agent.name}</div>
                <div style={{ fontSize: s(11), color: T.textMuted, marginTop: s(2) }}>{agent.role}</div>
              </div>

              {/* Status dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: s(5) }}>
                <div style={{
                  width: s(7), height: s(7),
                  borderRadius: '50%',
                  background: statusColor,
                  boxShadow: `0 0 6px ${statusColor}`,
                }} />
                <span style={{ fontSize: s(10), color: T.textMuted }}>Ativo</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Hero ícone central */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: s(60), height: s(60),
        background: accentColor,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: s(28),
        boxShadow: `0 0 0 ${s(10)}px ${accentColor}22, 0 0 0 ${s(20)}px ${accentColor}10`,
        zIndex: 10,
      }}>
        {heroEmoji}
      </div>

      {/* Footer overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: s(100),
        background: `linear-gradient(to top, ${T.bgBase} 0%, transparent 100%)`,
        zIndex: 3,
        display: 'flex', alignItems: 'flex-end',
        padding: `${s(20)}px ${s(28)}px`,
      }}>
        <div style={{ fontSize: s(12), color: T.textMuted }}>
          {subtitle}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: s(12), color: T.textMuted }}>{brandName}</div>
      </div>
    </div>
  )
}
