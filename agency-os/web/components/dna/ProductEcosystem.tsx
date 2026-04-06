'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, ArrowRight, X, Check, Loader2, Package, ChevronDown } from 'lucide-react'

export interface ClientProduct {
  id: string
  name: string
  category: string
  type: 'free' | 'paid' | 'high_ticket'
  promise: string | null
  description: string | null
  target_audience: string | null
  price_cents: number | null
  price_label: string | null
  checkout_url: string | null
  funnel_stage: 'tofu' | 'mofu' | 'bofu'
  next_product_id: string | null
  status: 'active' | 'paused' | 'off_sale'
}

interface Props {
  clientId: string
  initialProducts: ClientProduct[]
}

const STAGES = [
  { id: 'tofu', label: 'Topo de Funil',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   dot: 'bg-blue-400'  },
  { id: 'mofu', label: 'Meio de Funil',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  { id: 'bofu', label: 'Fundo de Funil', color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', dot: 'bg-green-400' },
]

const TYPE_CONFIG = {
  free:        { label: 'Gratuito',    badge: 'bg-green-500/15 text-green-400 border-green-500/20' },
  paid:        { label: 'Pago',        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  high_ticket: { label: 'High Ticket', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
}

const CATEGORIES = ['isca_digital', 'produto_pago', 'high_ticket', 'servico', 'evento', 'assinatura', 'outro']
const CATEGORY_LABELS: Record<string, string> = {
  isca_digital: 'Isca Digital',
  produto_pago: 'Produto Pago',
  high_ticket: 'High Ticket',
  servico: 'Serviço',
  evento: 'Evento',
  assinatura: 'Assinatura',
  outro: 'Outro',
}

const EMPTY_FORM = {
  name: '',
  category: 'produto_pago',
  type: 'paid' as ClientProduct['type'],
  promise: '',
  description: '',
  target_audience: '',
  price_label: '',
  checkout_url: '',
  funnel_stage: 'tofu' as ClientProduct['funnel_stage'],
  status: 'active' as ClientProduct['status'],
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:border-amber-500/40 focus:outline-none'
const selectCls = `${inputCls} appearance-none`

interface ProductFormProps {
  initial: typeof EMPTY_FORM
  onSave: (data: typeof EMPTY_FORM) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function ProductForm({ initial, onSave, onCancel, saving }: ProductFormProps) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome do produto *">
          <input className={inputCls} placeholder="Ex: Ebook Manual Anti-Burrice" value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Categoria">
          <div className="relative">
            <select className={selectCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
        </Field>

        <Field label="Tipo">
          <div className="relative">
            <select className={selectCls} value={form.type} onChange={e => set('type', e.target.value as ClientProduct['type'])}>
              <option value="free">Gratuito</option>
              <option value="paid">Pago</option>
              <option value="high_ticket">High Ticket</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
        </Field>
        <Field label="Preço (exibição)">
          <input className={inputCls} placeholder='Ex: "Grátis", "R$ 97", "A partir de R$ 5.000"' value={form.price_label} onChange={e => set('price_label', e.target.value)} />
        </Field>

        <Field label="Etapa do Funil">
          <div className="relative">
            <select className={selectCls} value={form.funnel_stage} onChange={e => set('funnel_stage', e.target.value as ClientProduct['funnel_stage'])}>
              <option value="tofu">Topo (ToFu) — Atrair / Educar</option>
              <option value="mofu">Meio (MoFu) — Engajar / Qualificar</option>
              <option value="bofu">Fundo (BoFu) — Converter / Vender</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
        </Field>
        <Field label="Status">
          <div className="relative">
            <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value as ClientProduct['status'])}>
              <option value="active">✅ Ativo</option>
              <option value="paused">⏸ Pausado</option>
              <option value="off_sale">🚫 Fora de venda</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
        </Field>
      </div>

      <Field label="Promessa Principal (maior transformação / benefício)">
        <textarea className={`${inputCls} min-h-[60px] resize-none`} placeholder="Ex: Aprenda a usar IA para 10x sua produtividade em 30 dias sem precisar de conhecimento técnico" value={form.promise} onChange={e => set('promise', e.target.value)} />
      </Field>

      <Field label="Público-alvo específico deste produto">
        <input className={inputCls} placeholder="Ex: Empreendedores iniciantes que ainda não sabem usar IA no dia a dia" value={form.target_audience} onChange={e => set('target_audience', e.target.value)} />
      </Field>

      <Field label="Link de Checkout / Inscrição">
        <input className={inputCls} type="url" placeholder="https://..." value={form.checkout_url} onChange={e => set('checkout_url', e.target.value)} />
      </Field>

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
          <X size={12} /> Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-[var(--color-text-inverse)] hover:bg-amber-400 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Salvar produto
        </button>
      </div>
    </div>
  )
}

function ProductCard({
  product,
  allProducts,
  onEdit,
  onDelete,
  onStatusToggle,
}: {
  product: ClientProduct
  allProducts: ClientProduct[]
  onEdit: () => void
  onDelete: () => void
  onStatusToggle: () => void
}) {
  const typeConf = TYPE_CONFIG[product.type] ?? TYPE_CONFIG.paid
  const nextProduct = allProducts.find(p => p.id === product.next_product_id)
  const isInactive = product.status !== 'active'

  return (
    <div className={`group rounded-xl border bg-[var(--color-bg-surface)] p-4 space-y-3 transition-opacity ${isInactive ? 'opacity-50' : ''} ${isInactive ? 'border-[var(--color-border-subtle)]' : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeConf.badge}`}>
              {typeConf.label}
            </span>
            {product.price_label && (
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">{product.price_label}</span>
            )}
            {isInactive && (
              <span className="text-[10px] text-[var(--color-text-muted)]">({product.status === 'paused' ? 'Pausado' : 'Fora de venda'})</span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)] leading-tight">{product.name}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">{CATEGORY_LABELS[product.category] ?? product.category}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={onStatusToggle} className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors" title={isInactive ? 'Reativar' : 'Pausar'}>
            {isInactive ? <Check size={12} /> : <X size={12} />}
          </button>
          <button onClick={onDelete} className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Promise */}
      {product.promise && (
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">{product.promise}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {product.checkout_url ? (
          <a href={product.checkout_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors">
            <ExternalLink size={10} /> Ver checkout
          </a>
        ) : <span />}

        {nextProduct && (
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
            <ArrowRight size={10} />
            <span>Upsell: <span className="text-[var(--color-text-secondary)]">{nextProduct.name}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ProductEcosystem({ clientId, initialProducts }: Props) {
  const [products, setProducts] = useState<ClientProduct[]>(initialProducts)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd(form: typeof EMPTY_FORM) {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const newProd = await res.json()
        setProducts(prev => [...prev, newProd])
        setAdding(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(productId: string, form: typeof EMPTY_FORM) {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setProducts(prev => prev.map(p => p.id === productId ? updated : p))
        setEditingId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(productId: string) {
    await fetch(`/api/clients/${clientId}/products/${productId}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== productId))
  }

  async function toggleStatus(product: ClientProduct) {
    const next = product.status === 'active' ? 'paused' : 'active'
    const res = await fetch(`/api/clients/${clientId}/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProducts(prev => prev.map(p => p.id === product.id ? updated : p))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Ecossistema de Produtos</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            O @ORACLE usa esta lista para sugerir o CTA mais adequado em cada conteúdo gerado.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-[var(--color-text-inverse)] hover:bg-amber-400 transition-all"
          >
            <Plus size={13} /> Adicionar produto
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <ProductForm
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      )}

      {/* Stages */}
      {STAGES.map(stage => {
        const stageProducts = products.filter(p => p.funnel_stage === stage.id)
        return (
          <div key={stage.id}>
            <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${stage.bg}`}>
              <div className={`h-2 w-2 rounded-full ${stage.dot}`} />
              <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
              <span className="text-xs text-[var(--color-text-muted)]">— {stageProducts.length} produto{stageProducts.length !== 1 ? 's' : ''}</span>
            </div>

            {stageProducts.length === 0 ? (
              <p className="pl-2 text-xs text-[var(--color-text-muted)] italic">Nenhum produto nesta etapa.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stageProducts.map(product => (
                  editingId === product.id ? (
                    <div key={product.id} className="sm:col-span-2 lg:col-span-3">
                      <ProductForm
                        initial={{
                          name: product.name,
                          category: product.category,
                          type: product.type,
                          promise: product.promise ?? '',
                          description: product.description ?? '',
                          target_audience: product.target_audience ?? '',
                          price_label: product.price_label ?? '',
                          checkout_url: product.checkout_url ?? '',
                          funnel_stage: product.funnel_stage,
                          status: product.status,
                        }}
                        onSave={(form) => handleEdit(product.id, form)}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                      />
                    </div>
                  ) : (
                    <ProductCard
                      key={product.id}
                      product={product}
                      allProducts={products}
                      onEdit={() => setEditingId(product.id)}
                      onDelete={() => handleDelete(product.id)}
                      onStatusToggle={() => toggleStatus(product)}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Empty state */}
      {products.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)]">
            <Package size={22} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Nenhum produto cadastrado</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
            Adicione seus produtos e ofertas para que o @ORACLE possa sugerir o CTA certo em cada conteúdo.
          </p>
          <button onClick={() => setAdding(true)} className="mt-4 flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-[var(--color-text-inverse)] hover:bg-amber-400 transition-all">
            <Plus size={13} /> Adicionar primeiro produto
          </button>
        </div>
      )}
    </div>
  )
}
