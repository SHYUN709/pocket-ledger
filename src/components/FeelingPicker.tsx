import { setFeeling } from '../db/repo'
import type { Feeling } from '../db/schema'

const OPTIONS: { value: Exclude<Feeling, null | 'meh'>; emoji: string; label: string }[] = [
  { value: 'good', emoji: '😊', label: '잘 썼어' },
  { value: 'bad', emoji: '😩', label: '후회' },
  { value: 'pending', emoji: '⏳', label: '나중에' },
]

/** 지출 저장 직후 토스트 안에 뜨는 만족·후회 버튼. 안 누르면 건너뛰기 */
export default function FeelingPicker({ txId, onDone }: { txId: string; onDone: () => void }) {
  return (
    <div className="mt-2.5 flex gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={async () => {
            await setFeeling(txId, o.value)
            onDone()
          }}
          className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-paper/15 text-xs font-semibold active:scale-95"
        >
          <span className="text-base">{o.emoji}</span>
          {o.label}
        </button>
      ))}
    </div>
  )
}
