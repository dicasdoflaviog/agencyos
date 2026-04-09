'use client'
import { useState, useCallback } from 'react'
import { EditorialTemplate } from './templates/EditorialTemplate'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Slide {
  number: number
  title: string
  subtitle: string
  image_url: string
  prompt: string
}

type SlideStatus = 'pending' | 'approved' | 'rejected'

interface CarouselPreviewProps {
  assetId: string
  slides: Slide[]
  caption: string
  template: string
  userRole: 'admin' | 'collaborator' | 'viewer'
  onApproveAll?: () => void
  onNewCarousel?: () => void
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CarouselPreview({
  assetId,
  slides,
  caption,
  template,
  userRole,
  onApproveAll,
  onNewCarousel,
}: CarouselPreviewProps) {
  const [currentIdx, setCurrentIdx]       = useState(0)
  const [slideStatuses, setSlideStatuses] = useState<SlideStatus[]>(slides.map(() => 'pending'))
  const [editMode, setEditMode]           = useState(false)
  const [refineInput, setRefineInput]     = useState('')
  const [isRefining, setIsRefining]       = useState(false)
  const [isApprovingAll, setIsApprovingAll] = useState(false)
  const [localSlides, setLocalSlides]     = useState<Slide[]>(slides)
  const [feedbackMsg, setFeedbackMsg]     = useState<string | null>(null)

  const canEdit       = userRole === 'admin' || userRole === 'collaborator'
  const approvedCount = slideStatuses.filter(s => s === 'approved').length
  const allApproved   = approvedCount === slides.length
  const current       = localSlides[currentIdx]
  const currentStatus = slideStatuses[currentIdx]

  const hashtags              = caption.match(/#\w+/g) ?? []
  const captionWithoutHashtags = caption.replace(/#\w+/g, '').trim()

  // ── Feedback temporário ───────────────────────────────────────────────────

  const showFeedback = useCallback((msg: string) => {
    setFeedbackMsg(msg)
    setTimeout(() => setFeedbackMsg(null), 2000)
  }, [])

  // ── Navegação ─────────────────────────────────────────────────────────────

  const goTo = (idx: number) => {
    setCurrentIdx(idx)
    setRefineInput('')
  }

  // ── Aprovação individual ──────────────────────────────────────────────────

  const approveSlide = async () => {
    await fetch('/api/agents/atlas/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, action: 'approved' }),
    })
    const next = [...slideStatuses]
    next[currentIdx] = 'approved'
    setSlideStatuses(next)
    showFeedback('Slide aprovado')
    if (currentIdx < slides.length - 1) setCurrentIdx(currentIdx + 1)
  }

  const rejectSlide = () => {
    const next = [...slideStatuses]
    next[currentIdx] = 'rejected'
    setSlideStatuses(next)
    showFeedback('Slide reprovado')
  }

  // ── Aprovação total ───────────────────────────────────────────────────────

  const approveAll = async () => {
    setIsApprovingAll(true)
    try {
      await fetch('/api/agents/atlas/approve-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      })
      setSlideStatuses(slides.map(() => 'approved'))
      showFeedback('Carrossel aprovado e enviado para publicação')
      onApproveAll?.()
    } catch {
      showFeedback('Erro ao aprovar')
    } finally {
      setIsApprovingAll(false)
    }
  }

  // ── Refinamento de slide ──────────────────────────────────────────────────

  const refineSlide = async () => {
    if (!refineInput.trim() || isRefining) return
    setIsRefining(true)
    try {
      const res = await fetch('/api/agents/atlas/refine-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          slideNumber: current.number,
          instruction: refineInput,
          regenerateImage: false,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const next = [...localSlides]
        next[currentIdx] = { ...next[currentIdx], ...data.slide }
        setLocalSlides(next)
        setRefineInput('')
        showFeedback('Slide refinado')
      }
    } catch {
      showFeedback('Erro ao refinar')
    } finally {
      setIsRefining(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text)
    showFeedback(`${label} copiado`)
  }

  const downloadSlide = () => {
    if (!current.image_url) return
    const a = document.createElement('a')
    a.href = current.image_url
    a.download = `slide-${current.number}.png`
    a.click()
  }

  // ── Estilos ───────────────────────────────────────────────────────────────

  const S = {
    page: { padding: '0 0 3rem', fontFamily: 'var(--font-sans)' } as React.CSSProperties,

    topbar: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1rem 0 1.5rem',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      marginBottom: '1.5rem', flexWrap: 'wrap' as const, gap: '10px',
    },

    topTitle: { fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' },
    topMeta:  { fontSize: '12px', color: 'var(--color-text-secondary)' },
    topActions: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' as const },

    btn: {
      padding: '8px 14px', borderRadius: 'var(--border-radius-md)', fontSize: '13px',
      fontWeight: 500, cursor: 'pointer',
      border: '0.5px solid var(--color-border-secondary)',
      background: 'transparent', color: 'var(--color-text-primary)',
    } as React.CSSProperties,

    btnPrimary: {
      padding: '8px 18px', borderRadius: 'var(--border-radius-md)', fontSize: '13px',
      fontWeight: 500, cursor: 'pointer', border: 'none',
      background: '#F59E0B', color: '#000',
      opacity: isApprovingAll ? 0.6 : 1,
    } as React.CSSProperties,

    sectionLabel: {
      fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' as const,
      letterSpacing: '.07em', color: 'var(--color-text-secondary)', marginBottom: '10px',
    },

    thumbsRow: {
      display: 'flex', gap: '10px', overflowX: 'auto' as const,
      paddingBottom: '4px', marginBottom: '10px', scrollbarWidth: 'none' as const,
    },

    thumb: (active: boolean, status: SlideStatus): React.CSSProperties => ({
      flexShrink: 0, width: '108px', cursor: 'pointer',
      borderRadius: 'var(--border-radius-md)', overflow: 'hidden',
      border: active ? '2px solid #F59E0B'
        : status === 'approved' ? '2px solid var(--color-border-success)'
        : status === 'rejected' ? '2px solid var(--color-border-danger)'
        : '0.5px solid var(--color-border-tertiary)',
    }),

    thumbImg: { width: '108px', height: '136px', objectFit: 'cover' as const, display: 'block', background: 'var(--color-background-secondary)' },

    thumbLabel: (status: SlideStatus): React.CSSProperties => ({
      padding: '5px 7px', fontSize: '10px',
      color: status === 'approved' ? 'var(--color-text-success)'
        : status === 'rejected' ? 'var(--color-text-danger)'
        : 'var(--color-text-secondary)',
      background: 'var(--color-background-primary)',
      borderTop: '0.5px solid var(--color-border-tertiary)',
      whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
    }),

    indicators: { display: 'flex', gap: '4px', marginBottom: '1.25rem' },

    dot: (active: boolean): React.CSSProperties => ({
      width: '7px', height: '7px', borderRadius: '50%', cursor: 'pointer',
      background: active ? '#F59E0B' : 'var(--color-border-secondary)',
    }),

    grid: {
      display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      gap: '14px', marginBottom: '1.25rem',
    },

    card: {
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)', overflow: 'hidden',
      position: 'relative' as const,
    },

    hero: {
      width: '100%', aspectRatio: '4/5', objectFit: 'cover' as const, display: 'block',
      background: 'var(--color-background-secondary)', minHeight: '280px',
    },

    imageOverlay: {
      position: 'absolute' as const, bottom: 0, left: 0, right: 0,
      background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 50%, transparent 100%)',
      padding: '48px 14px 14px', pointerEvents: 'none' as const,
    },

    overlayNum:   { fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: '4px' },
    overlayTitle: { fontSize: '16px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, marginBottom: '5px', textShadow: '0 1px 4px rgba(0,0,0,0.6)' },
    overlaySub:   { fontSize: '12px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.4, textShadow: '0 1px 3px rgba(0,0,0,0.5)' },

    cardFooter: { padding: '10px 14px', borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', flexDirection: 'column' as const, gap: '8px' },

    slideNum:   { fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '.06em' },
    slideTitle: { fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)' },
    slideSub:   { fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 },

    actionsRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' as const },

    actionBtn: {
      fontSize: '11px', padding: '5px 9px', borderRadius: 'var(--border-radius-md)',
      border: '0.5px solid var(--color-border-tertiary)',
      background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer',
    } as React.CSSProperties,

    copyPanel: {
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)', padding: '1.25rem',
      display: 'flex', flexDirection: 'column' as const, gap: '14px',
    },

    copyLabel:  { fontSize: '10px', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '.06em', color: 'var(--color-text-secondary)', marginBottom: '4px' },
    copyText:   { fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.5 },
    copyHook:   { fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)' },

    captionBox: {
      fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6,
      background: 'var(--color-background-secondary)',
      borderRadius: 'var(--border-radius-md)', padding: '10px 12px',
      maxHeight: '150px', overflowY: 'auto' as const, whiteSpace: 'pre-wrap' as const,
    },

    hashtags: { display: 'flex', flexWrap: 'wrap' as const, gap: '5px' },
    hashtag: {
      fontSize: '11px', padding: '3px 9px', borderRadius: '20px',
      background: 'var(--color-background-secondary)',
      border: '0.5px solid var(--color-border-tertiary)',
      color: 'var(--color-text-secondary)',
    },

    divider: { height: '0.5px', background: 'var(--color-border-tertiary)' },

    refineRow: { display: 'flex', gap: '7px' },
    refineInput: {
      flex: 1, fontSize: '12px', padding: '8px 10px',
      border: '0.5px solid var(--color-border-secondary)',
      borderRadius: 'var(--border-radius-md)',
      background: 'var(--color-background-secondary)',
      color: 'var(--color-text-primary)', outline: 'none',
    } as React.CSSProperties,

    approveRow: { display: 'flex', gap: '8px' },

    bottomBar: {
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap' as const, gap: '10px',
    },

    statusBadge: (status: 'pending' | 'done'): React.CSSProperties => ({
      fontSize: '12px', fontWeight: 500, padding: '4px 12px', borderRadius: '20px',
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: status === 'done' ? 'var(--color-background-success)' : 'var(--color-background-warning)',
      color: status === 'done' ? 'var(--color-text-success)' : 'var(--color-text-warning)',
    }),

    dot2: (done: boolean): React.CSSProperties => ({
      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
      background: done ? '#22c55e' : '#F59E0B',
    }),

    slideBadge: (status: SlideStatus): React.CSSProperties => ({
      fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px',
      display: 'inline-flex', alignItems: 'center', gap: '5px', width: 'fit-content',
      background: status === 'approved' ? 'var(--color-background-success)'
        : status === 'rejected' ? 'var(--color-background-danger)'
        : 'var(--color-background-warning)',
      color: status === 'approved' ? 'var(--color-text-success)'
        : status === 'rejected' ? 'var(--color-text-danger)'
        : 'var(--color-text-warning)',
    }),

    feedback: {
      position: 'fixed' as const, bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-secondary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '8px 18px', fontSize: '13px', color: 'var(--color-text-primary)',
      zIndex: 100,
    },
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {feedbackMsg && <div style={S.feedback}>{feedbackMsg}</div>}

      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <div style={S.topTitle}>Carrossel gerado — {slides.length} slides</div>
          <div style={S.topMeta}>{template} · Feed 4:5 · {approvedCount}/{slides.length} aprovados</div>
        </div>
        <div style={S.topActions}>
          <button style={S.btn} onClick={onNewCarousel}>+ Novo carrossel</button>
          {canEdit && (
            <button
              style={{ ...S.btn, ...(editMode ? { background: 'var(--color-background-warning)', color: 'var(--color-text-warning)', borderColor: 'var(--color-border-warning)' } : {}) }}
              onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Fechar editor' : 'Editar'}
            </button>
          )}
          <button style={S.btnPrimary} onClick={approveAll} disabled={isApprovingAll}>
            {isApprovingAll ? 'Aprovando...' : 'Aprovar tudo e enviar'}
          </button>
        </div>
      </div>

      {/* Thumbs row */}
      <div style={S.sectionLabel}>Slides — clique para navegar</div>
      <div style={S.thumbsRow}>
        {localSlides.map((slide, i) => (
          <div key={slide.number} style={S.thumb(i === currentIdx, slideStatuses[i])} onClick={() => goTo(i)}>
            {slide.image_url ? (
              <img src={slide.image_url} alt={slide.title} style={S.thumbImg} />
            ) : (
              <div style={{ ...S.thumbImg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{i + 1}</span>
              </div>
            )}
            <div style={S.thumbLabel(slideStatuses[i])}>
              {i + 1} · {slide.title}
            </div>
          </div>
        ))}
      </div>

      {/* Indicators */}
      <div style={S.indicators}>
        {localSlides.map((_, i) => (
          <div key={i} style={S.dot(i === currentIdx)} onClick={() => goTo(i)} />
        ))}
      </div>

      {/* Main grid */}
      <div style={S.grid}>

        {/* Criativo grande */}
        <div style={S.card}>
          {template === 'titulo-bold' ? (
            /* Template Editorial — renderiza o slide como componente React (sem img+overlay) */
            <EditorialTemplate
              title={current.title}
              subtitle={current.subtitle}
              backgroundImage={current.image_url || undefined}
              size={480}
            />
          ) : current.image_url ? (
            <img src={current.image_url} alt={current.title} style={S.hero} />
          ) : (
            <div style={{ ...S.hero, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Gerando imagem...</span>
            </div>
          )}

          {/* Overlay de copy sobre a imagem (somente templates sem componente próprio) */}
          {template !== 'titulo-bold' && (
          <div style={S.imageOverlay}>
            <div style={S.overlayNum}>Slide {current.number} de {slides.length}</div>
            <div style={S.overlayTitle}>{current.title}</div>
            <div style={S.overlaySub}>{current.subtitle}</div>
          </div>
          )}

          <div style={S.cardFooter}>
            <div style={S.actionsRow}>
              <button style={S.actionBtn} onClick={downloadSlide}>Download</button>
              {canEdit && (
                <button style={S.actionBtn} onClick={() => copyText(current.prompt, 'Prompt')}>
                  Copiar prompt
                </button>
              )}
              {canEdit && (
                <button style={S.actionBtn} onClick={async () => {
                  const res = await fetch('/api/agents/atlas/refine-slide', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assetId, slideNumber: current.number, instruction: 'regenerate image with same prompt', regenerateImage: true }),
                  })
                  const d = await res.json()
                  if (d.success) {
                    const n = [...localSlides]
                    n[currentIdx] = { ...n[currentIdx], image_url: d.slide.image_url }
                    setLocalSlides(n)
                  }
                  showFeedback('Imagem regenerada')
                }}>
                  Regenerar imagem
                </button>
              )}
            </div>

            {/* Refinamento inline — só admin/collaborator */}
            {canEdit && editMode && (
              <div style={{ marginTop: '4px' }}>
                <div style={S.refineRow}>
                  <input
                    value={refineInput}
                    onChange={e => setRefineInput(e.target.value)}
                    placeholder="Ex: deixe mais curto, adicione dado estatístico..."
                    style={S.refineInput}
                    onKeyDown={e => e.key === 'Enter' && refineSlide()}
                  />
                  <button
                    style={{ ...S.btn, fontSize: '12px', padding: '7px 12px', whiteSpace: 'nowrap' }}
                    onClick={refineSlide}
                    disabled={isRefining}>
                    {isRefining ? '...' : 'Refinar'}
                  </button>
                </div>
              </div>
            )}

            <div style={S.slideBadge(currentStatus)}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentStatus === 'approved' ? '#22c55e' : currentStatus === 'rejected' ? 'var(--color-text-danger)' : '#F59E0B' }} />
              {currentStatus === 'approved' ? 'Aprovado' : currentStatus === 'rejected' ? 'Reprovado' : 'Aguardando aprovação'}
            </div>
          </div>
        </div>

        {/* Copy panel */}
        <div style={S.copyPanel}>

          <div>
            <div style={S.copyLabel}>Gancho do slide</div>
            <div style={S.copyHook}>{current.title}</div>
          </div>

          <div style={S.divider} />

          <div>
            <div style={S.copyLabel}>Subtítulo</div>
            <div style={{ ...S.copyText, color: 'var(--color-text-secondary)' }}>{current.subtitle}</div>
          </div>

          <div style={S.divider} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={S.copyLabel}>Legenda do post</div>
              <button style={{ ...S.actionBtn, padding: '3px 8px', fontSize: '10px' }}
                onClick={() => copyText(caption, 'Legenda')}>
                Copiar
              </button>
            </div>
            <div style={S.captionBox}>{captionWithoutHashtags}</div>
          </div>

          {hashtags.length > 0 && (
            <div>
              <div style={S.copyLabel}>Hashtags</div>
              <div style={S.hashtags}>
                {hashtags.map((h, i) => <span key={i} style={S.hashtag}>{h}</span>)}
              </div>
            </div>
          )}

          <div style={S.divider} />

          {/* Aprovação individual + total */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentStatus !== 'approved' ? (
              <div style={S.approveRow}>
                <button style={{ ...S.btn, flex: 1, fontSize: '12px', textAlign: 'center' }} onClick={approveSlide}>
                  Aprovar este slide
                </button>
                <button
                  style={{ ...S.btn, flex: 1, fontSize: '12px', textAlign: 'center', color: 'var(--color-text-danger)', borderColor: 'var(--color-border-danger)' }}
                  onClick={rejectSlide}>
                  Reprovar
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--color-text-success)', padding: '8px 0' }}>
                Slide aprovado — avance para o próximo
              </div>
            )}
            <button
              style={{ ...S.btnPrimary, width: '100%', padding: '10px' }}
              onClick={approveAll}
              disabled={isApprovingAll || allApproved}>
              {allApproved ? 'Carrossel aprovado e enviado' : isApprovingAll ? 'Aprovando...' : 'Aprovar tudo e enviar para publicação'}
            </button>
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div style={S.bottomBar}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
            {approvedCount} de {slides.length} slides aprovados
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
            {allApproved
              ? 'Carrossel pronto — o agente postador pode publicar'
              : 'Aprove cada slide ou clique em "Aprovar tudo"'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={S.statusBadge(allApproved ? 'done' : 'pending')}>
            <div style={S.dot2(allApproved)} />
            {allApproved ? 'Pronto para publicar' : `${slides.length - approvedCount} pendentes`}
          </div>
          {!allApproved && (
            <button style={S.btnPrimary} onClick={approveAll} disabled={isApprovingAll}>
              {isApprovingAll ? 'Aprovando...' : 'Aprovar tudo'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
