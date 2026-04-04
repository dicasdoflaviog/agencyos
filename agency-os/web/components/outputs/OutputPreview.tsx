'use client'

import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Code2, Eye, Copy, Check } from 'lucide-react'

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(m => m.default),
  { ssr: false, loading: () => <div className="h-full bg-[#09090B] animate-pulse rounded" /> }
)

interface OutputPreviewProps {
  content: string
  type?: 'html' | 'text' | 'json'
  title?: string
}

export function OutputPreview({ content, type = 'text', title }: OutputPreviewProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHtml = type === 'html' || content.trimStart().startsWith('<')

  return (
    <div className="flex flex-col border border-white/[0.07] rounded-xl overflow-hidden bg-[#09090B]">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] bg-[#18181B]">
        <div className="flex gap-1">
          {isHtml && (
            <button
              onClick={() => setTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${tab === 'preview' ? 'bg-[#27272A] text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
            >
              <Eye size={12} /> Preview
            </button>
          )}
          <button
            onClick={() => setTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${tab === 'code' ? 'bg-[#27272A] text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
          >
            <Code2 size={12} /> {type === 'html' ? 'HTML' : type === 'json' ? 'JSON' : 'Texto'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {title && <span className="text-xs text-[#52525B]">{title}</span>}
          <button onClick={copy} className="flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="h-[400px]">
        {tab === 'preview' && isHtml ? (
          <iframe
            srcDoc={content}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0 bg-white"
            title="Output Preview"
          />
        ) : (
          <Suspense fallback={<div className="h-full bg-[#09090B]" />}>
            <MonacoEditor
              height="100%"
              language={type === 'json' ? 'json' : type === 'html' ? 'html' : 'plaintext'}
              value={content}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}
