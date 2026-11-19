import type { Category } from '../db/schema'

/** 카테고리 타일. 탭하면 바로 onPick — 저장 버튼이 따로 없다 */
export default function CategoryGrid({
  categories,
  onPick,
  disabledReason,
  selectedId,
}: {
  categories: Category[]
  onPick: (c: Category) => void
  /** 문자열을 돌려주면 그 카테고리는 흐리게 표시되고 이유가 보인다 */
  disabledReason?: (c: Category) => string | undefined
  selectedId?: string
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {categories.map((c) => {
        const reason = disabledReason?.(c)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            aria-disabled={reason ? true : undefined}
            className={`flex h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl border transition-transform active:scale-95 ${
              selectedId === c.id ? 'border-ink bg-card' : 'border-line bg-card/60'
            } ${reason ? 'border-dashed opacity-60' : ''}`}
          >
            <span className={`leading-none ${reason ? 'text-[17px]' : 'text-[22px]'}`}>{c.emoji}</span>
            <span className="text-[11px] leading-tight font-medium text-ink">{c.name}</span>
            {reason && <span className="text-[9px] leading-tight font-bold text-stamp">{reason}</span>}
          </button>
        )
      })}
    </div>
  )
}
