import { MarketplaceClient } from '@/components/marketplace/MarketplaceClient'
import { SQUADS } from '@/lib/team-data'

export const metadata = { title: 'Time de IA | Agency OS' }

export default function MarketplacePage() {
  return (
    <div>
      <MarketplaceClient squads={SQUADS} />
    </div>
  )
}
