interface RoleBadgeProps {
  role: string
}

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin:        { label: 'Admin',         className: 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20' },
  collaborator: { label: 'Colaborador',   className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  viewer:       { label: 'Visualizador',  className: 'bg-white/[0.06] text-[#A1A1AA] border border-white/[0.07]' },
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
