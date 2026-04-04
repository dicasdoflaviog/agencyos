interface Props {
  oldContent: string
  newContent: string
}

export function VersionDiff({ oldContent, newContent }: Props) {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const maxLen = Math.max(oldLines.length, newLines.length)

  const diffs: { type: 'same' | 'removed' | 'added'; line: string }[] = []
  for (let i = 0; i < maxLen; i++) {
    const ol = oldLines[i]
    const nl = newLines[i]
    if (ol === nl) {
      diffs.push({ type: 'same', line: ol ?? '' })
    } else {
      if (ol !== undefined) diffs.push({ type: 'removed', line: ol })
      if (nl !== undefined) diffs.push({ type: 'added', line: nl })
    }
  }

  return (
    <div className="rounded border border-white/[0.07] bg-[#09090B] p-3 font-mono text-xs overflow-auto max-h-80">
      {diffs.map((d, i) => (
        <div
          key={i}
          className={
            d.type === 'added' ? 'bg-[#22C55E]/10 text-[#22C55E] px-2 py-0.5' :
            d.type === 'removed' ? 'bg-[#EF4444]/10 text-[#EF4444] px-2 py-0.5' :
            'text-[#A1A1AA] px-2 py-0.5'
          }
        >
          <span className="mr-2 opacity-50">{d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}</span>
          {d.line || ' '}
        </div>
      ))}
    </div>
  )
}
