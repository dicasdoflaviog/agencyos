import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  change?: number
  /** Accepts a LucideIcon component or a ReactNode (e.g. pre-rendered JSX) */
  icon?: LucideIcon | React.ReactNode
}

export function MetricCard({ label, value, change, icon }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0

  const renderIcon = () => {
    if (!icon) return null
    // If it's a function component (LucideIcon), render it
    if (typeof icon === 'function') {
      const Icon = icon as LucideIcon
      return <Icon size={18} className="text-[#F59E0B]" />
    }
    // Otherwise treat as ReactNode
    return icon as React.ReactNode
  }

  const iconNode = renderIcon()

  return (
    <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">{label}</p>
          <p className="mt-2 text-2xl font-bold font-display font-mono text-[#FAFAFA]">{value}</p>
          {change !== undefined && (
            <div
              className={cn(
                'mt-1.5 flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
              )}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>
                {isPositive ? '+' : ''}
                {change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {iconNode && (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F59E0B]/10">
            {iconNode}
          </div>
        )}
      </div>
    </div>
  )
}
