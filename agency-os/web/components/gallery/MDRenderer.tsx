'use client'

import dynamic from 'next/dynamic'

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then(m => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-2 p-4">
        <div className="h-3 w-3/4 rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-2/3 rounded bg-white/10" />
      </div>
    ),
  }
)

interface Props {
  content: string
  className?: string
}

export function MDRenderer({ content, className = '' }: Props) {
  return (
    <div data-color-mode="dark" className={className}>
      <MarkdownPreview
        source={content}
        style={{
          background: 'transparent',
          color: '#D4D4D8',
          fontSize: '13px',
          lineHeight: '1.7',
          fontFamily: 'inherit',
        }}
        wrapperElement={{ 'data-color-mode': 'dark' }}
      />
    </div>
  )
}
