import { useRef } from 'react'
import type { Category, Favorite } from '../db/schema'
import { formatWon } from '../domain/money'

/** 즐겨찾기 칩 줄. 탭 = 바로 기록, 길게 누르기 = 삭제 */
export default function FavoriteBar({
  favorites,
  categoryMap,
  onUse,
  onRemove,
  onAdd,
}: {
  favorites: Favorite[]
  categoryMap: Map<string, Category>
  onUse: (f: Favorite) => void
  onRemove: (f: Favorite) => void
  onAdd: () => void
}) {
  const timer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  const emojiOf = (id: string) => categoryMap.get(id)?.emoji ?? '⭐'

  return (
    <div className="no-scrollbar -mx-5 flex shrink-0 gap-2 overflow-x-auto px-5 py-1">
      {favorites.map((f) => (
        <button
          key={f.id}
          type="button"
          className="flex h-9 shrink-0 select-none items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm active:scale-95"
          onPointerDown={() => {
            longPressed.current = false
            timer.current = window.setTimeout(() => {
              longPressed.current = true
              onRemove(f)
            }, 550)
          }}
          onPointerUp={() => window.clearTimeout(timer.current)}
          onPointerLeave={() => window.clearTimeout(timer.current)}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (!longPressed.current) onUse(f)
          }}
        >
          <span>{emojiOf(f.categoryId)}</span>
          <span className="font-medium">{f.label}</span>
          <span className={`num ${f.type === 'income' ? 'text-income' : 'text-muted'}`}>{formatWon(f.amount)}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex h-9 shrink-0 items-center rounded-full border border-dashed border-muted/60 px-3 text-sm text-muted"
      >
        ＋ 즐겨찾기
      </button>
    </div>
  )
}
