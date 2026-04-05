'use client'
import { usePathname } from 'next/navigation'
import NotificationBell from '@/components/notifications/NotificationBell'

const PAGE_TITLES: Record<string, string> = {
  '/':           'Overview',
  '/clients':    'Clientes',
  '/jobs':       'Jobs',
  '/gallery':    'Galeria',
  '/financial':  'Financeiro',
  '/analytics':  'Analytics',
  '/pipelines':  'Pipelines',
  '/templates':  'Templates',
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [key, value] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key) && key !== '/') return value
  }
  return 'Agency OS'
}

export function TopBar() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="relative z-10 flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-6">
      <h1 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">{title}</h1>
      <NotificationBell />
    </header>
  )
}
