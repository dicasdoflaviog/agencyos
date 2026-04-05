'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MDRenderer } from './MDRenderer'

interface Props {
  content: string
}

// Parses content into slides by detecting slide headers:
// ## Slide N / **Slide N** / Slide N: / 🎠 Slide N
function parseSlides(content: string): { title: string; body: string }[] {
  const SLIDE_HEADER = /(?:^|\n)((?:#{1,3}\s+)?(?:🎠\s*)?Slide\s+\d+[^\n]*)/gi

  const parts = content.split(SLIDE_HEADER).filter(s => s.trim())

  // If no slide markers found, return the whole content as one "slide"
  if (parts.length <= 1) {
    return [{ title: 'Conteúdo', body: content }]
  }

  const slides: { title: string; body: string }[] = []
  for (let i = 0; i < parts.length; i += 2) {
    const title = parts[i]?.replace(/^#+\s*/, '').trim() ?? `Slide ${i / 2 + 1}`
    const body = parts[i + 1]?.trim() ?? ''
    slides.push({ title, body })
  }
  return slides.filter(s => s.body.length > 0 || s.title.length > 0)
}

export function CarouselPreview({ content }: Props) {
  const slides = parseSlides(content)
  const [current, setCurrent] = useState(0)
  const total = slides.length

  if (total <= 1) {
    return <MDRenderer content={content} />
  }

  const prev = () => setCurrent(i => (i - 1 + total) % total)
  const next = () => setCurrent(i => (i + 1) % total)
  const slide = slides[current]

  return (
    <div className="relative">
      {/* Slide container */}
      <div className="min-h-[180px] rounded-lg border border-white/[0.07] bg-[#09090B] p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
          {slide.title}
        </p>
        <MDRenderer content={slide.body} />
      </div>

      {/* Navigation */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={prev}
          className="flex h-7 w-7 items-center justify-center rounded border border-white/[0.07] text-[#A1A1AA] transition hover:border-amber-500/30 hover:text-amber-400"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="flex h-7 w-7 items-center justify-center rounded border border-white/[0.07] text-[#A1A1AA] transition hover:border-amber-500/30 hover:text-amber-400"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-[#52525B]">
        {current + 1} / {total} slides
      </p>
    </div>
  )
}
