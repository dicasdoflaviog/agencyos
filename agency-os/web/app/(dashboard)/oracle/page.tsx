import { OracleChat } from '@/components/agents/OracleChat'

export const metadata = { title: 'Oracle | Agency OS' }

export default function OraclePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">ORACLE</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          Diretor de IA estratégico — orquestra 22 agentes especializados
        </p>
      </div>
      <OracleChat />
    </div>
  )
}
