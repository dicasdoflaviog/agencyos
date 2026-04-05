'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import type { Lead, LeadStage } from '@/types/database'

const STAGES: { id: LeadStage; label: string }[] = [
  { id: 'prospect',      label: 'Prospecto' },
  { id: 'contacted',     label: 'Contatado' },
  { id: 'proposal_sent', label: 'Proposta' },
  { id: 'negotiation',   label: 'Negociação' },
  { id: 'won',           label: 'Ganho' },
  { id: 'lost',          label: 'Perdido' },
]

function LeadCard({ lead, isDragging }: { lead: Lead; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lead.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 cursor-grab active:cursor-grabbing select-none"
    >
      <Link href={`/crm/leads/${lead.id}`} onClick={e => e.stopPropagation()} className="block">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{lead.name}</p>
        {lead.company && <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">{lead.company}</p>}
        {lead.deal_value != null && (
          <p className="text-xs text-[var(--color-accent)] mt-1 font-medium">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.deal_value)}
          </p>
        )}
      </Link>
    </div>
  )
}

interface Props {
  leads: Lead[]
}

export function CRMKanban({ leads: initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const newStage = STAGES.find(s => s.id === over.id)?.id
    if (!newStage) return

    const leadId = active.id as string
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stage === newStage) return

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l))

    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar stage')
      toast.success('Stage atualizado!')
    } catch {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: lead.stage } : l))
      toast.error('Erro ao mover lead')
    }
  }, [leads])

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative">
        <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage.id)
            const totalValue = stageLeads.reduce((s, l) => s + (l.deal_value ?? 0), 0)

            return (
              <div
                key={stage.id}
                id={stage.id}
                className="w-64 flex-shrink-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
              >
                <div className="p-3 border-b border-[var(--color-border-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">{stage.label}</span>
                    <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] rounded px-1.5 py-0.5">{stageLeads.length}</span>
                  </div>
                  {totalValue > 0 && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalValue)}
                    </p>
                  )}
                </div>
                <SortableContext items={stageLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {stageLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} isDragging={lead.id === activeId} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>
      </div>
      {/* Fade-right gradient scroll indicator */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#09090B] to-transparent" />
      </div>
      <DragOverlay>
        {activeLead && (
          <div className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-bg-elevated)] p-3 shadow-xl rotate-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{activeLead.name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
