import { ClientForm } from '@/components/clients/ClientForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewClientPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer mb-4"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Clientes
        </Link>
        <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Novo Cliente</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">Preencha os dados do cliente</p>
      </div>
      <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-6">
        <ClientForm mode="create" />
      </div>
    </div>
  )
}
