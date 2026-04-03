'use client'
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { type Job } from '@/types/database'
import { JobCard } from './JobCard'
import { cn } from '@/lib/utils'

const COLUMNS = [
  { key: 'backlog',     label: 'Backlog' },
  { key: 'in_progress', label: 'Em Andamento' },
  { key: 'review',     label: 'Revisão' },
  { key: 'done',       label: 'Concluído' },
] as const

type Status = typeof COLUMNS[number]['key']

function DraggableJob({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'opacity-40')}
    >
      <JobCard job={job} />
    </div>
  )
}

function DroppableColumn({ status, label, jobs }: { status: Status; label: string; jobs: Job[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">{label}</span>
        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-xs font-medium text-[#A1A1AA]">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[80px] rounded-md p-1 transition-colors duration-150',
          isOver && 'bg-[#F59E0B]/5 ring-1 ring-[#F59E0B]/20'
        )}
      >
        {jobs.map((job) => (
          <DraggableJob key={job.id} job={job} />
        ))}
        {jobs.length === 0 && (
          <div className={cn(
            'rounded-md border border-dashed border-white/[0.07] p-4 text-center transition-colors duration-150',
            isOver && 'border-[#F59E0B]/30'
          )}>
            <p className="text-xs text-[#A1A1AA]">Sem jobs</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function JobKanban({ jobs: initialJobs }: { jobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs)
  const [activeJob, setActiveJob] = useState<Job | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const grouped = COLUMNS.map((col) => ({
    ...col,
    jobs: jobs.filter((j) => j.status === col.key),
  }))

  function handleDragStart(event: DragStartEvent) {
    const job = jobs.find((j) => j.id === event.active.id)
    setActiveJob(job ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveJob(null)
    if (!over || active.id === over.id) return

    const jobId = active.id as string
    const newStatus = over.id as Status
    const job = jobs.find((j) => j.id === jobId)
    if (!job || job.status === newStatus) return

    // Optimistic update
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j))

    const supabase = createClient()
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId)
    if (error) {
      toast.error('Erro ao mover job')
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: job.status } : j))
    } else {
      toast.success(`Job movido para ${COLUMNS.find(c => c.key === newStatus)?.label}`)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {grouped.map(({ key, label, jobs: colJobs }) => (
          <DroppableColumn key={key} status={key} label={label} jobs={colJobs} />
        ))}
      </div>
      <DragOverlay>
        {activeJob && (
          <div className="rotate-1 opacity-90 shadow-2xl">
            <JobCard job={activeJob} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
