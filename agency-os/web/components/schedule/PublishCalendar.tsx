'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SchedulePostCard } from './SchedulePostCard'
import type { ScheduledPostPlatform } from '@/types/database'

interface ScheduledPost {
  id: string
  platform: ScheduledPostPlatform
  publish_at: string
  status: 'scheduled' | 'published' | 'failed'
  error_msg: string | null
  post: { id: string; title: string } | null
}

interface PublishCalendarProps {
  scheduledPosts: ScheduledPost[]
}

const DOT_COLORS: Record<ScheduledPostPlatform, string> = {
  instagram: 'bg-amber-400',
  linkedin:  'bg-blue-400',
  tiktok:    'bg-pink-400',
  twitter:   'bg-sky-400',
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function PublishCalendar({ scheduledPosts }: PublishCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  // Group posts by day
  const postsByDay = new Map<number, ScheduledPost[]>()
  for (const sp of scheduledPosts) {
    const d = new Date(sp.publish_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      const list = postsByDay.get(day) ?? []
      list.push(sp)
      postsByDay.set(day, list)
    }
  }

  const selectedPosts = selectedDay ? (postsByDay.get(selectedDay) ?? []) : []

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)
  while (cells.length % 7 !== 0) cells.push(null)

  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {MONTHS[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Day names */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-1 text-center text-xs font-medium text-zinc-500">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />
            }
            const posts = postsByDay.get(day) ?? []
            const isToday = day === todayDay
            const isSelected = day === selectedDay

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  'aspect-square flex flex-col items-center justify-start rounded-lg border p-1 transition-colors text-xs font-medium',
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : isToday
                    ? 'border-zinc-700 bg-zinc-800 text-[var(--color-text-primary)]'
                    : posts.length > 0
                    ? 'border-zinc-800 bg-[var(--color-bg-surface)] text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
                    : 'border-transparent text-zinc-500 hover:border-zinc-800 hover:bg-zinc-900',
                )}
              >
                <span className="leading-none">{day}</span>
                {posts.length > 0 && (
                  <div className="mt-auto flex flex-wrap justify-center gap-0.5 pb-0.5">
                    {posts.slice(0, 3).map(p => (
                      <span
                        key={p.id}
                        className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[p.platform])}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(Object.entries(DOT_COLORS) as [ScheduledPostPlatform, string][]).map(([plat, color]) => (
            <div key={plat} className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={cn('h-2 w-2 rounded-full', color)} />
              {plat.charAt(0).toUpperCase() + plat.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {/* Side panel */}
      {selectedDay !== null && (
        <div className="w-72 shrink-0">
          <h4 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            {String(selectedDay).padStart(2, '0')}/{String(month + 1).padStart(2, '0')}/{year}
          </h4>
          {selectedPosts.length > 0 ? (
            <div className="space-y-2.5">
              {selectedPosts.map(sp => (
                <SchedulePostCard
                  key={sp.id}
                  platform={sp.platform}
                  title={sp.post?.title ?? null}
                  publishAt={sp.publish_at}
                  status={sp.status}
                  errorMsg={sp.error_msg}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-[var(--color-bg-surface)] p-4 text-center text-sm text-zinc-500">
              Nenhum post agendado
            </div>
          )}
        </div>
      )}
    </div>
  )
}
