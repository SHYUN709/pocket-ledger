/** 알약 모양 선택 버튼 묶음 */
export default function Segment<T extends string>({
  value,
  onChange,
  options,
  full,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  full?: boolean
}) {
  return (
    <div className={`flex h-9 rounded-full bg-track p-0.5 ${full ? 'w-full' : ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full px-3 ${full ? 'flex-1' : ''} text-sm font-semibold whitespace-nowrap transition-colors ${
            value === o.value ? 'bg-raised text-ink shadow-sm' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

