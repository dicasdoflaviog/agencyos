import { MarketplaceClient } from '@/components/marketplace/MarketplaceClient'
import { SQUADS } from '@/lib/team-data'

export const metadata = { title: 'Time de Agentes | Agency OS' }

export default function AgentesPage() {
  return (
    <div>
      <MarketplaceClient squads={SQUADS} />
    </div>
  )
}
