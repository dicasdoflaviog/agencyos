'use client'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/':          'Overview',
  '/clients':   'Clientes',
  '/jobs':      'Jobs',
  '/gallery':   'Galeria',
  '/financial': 'Financeiro',
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
    <header className="flex h-14 flex-shrink-0 items-center border-b border-white/[0.07] bg-[#09090B] px-6">
      <h1 className="text-sm font-semibold text-[#FAFAFA] tracking-tight">{title}</h1>
    </header>
  )
}
