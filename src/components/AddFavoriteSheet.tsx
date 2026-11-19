import { useEffect, useState } from 'react'
import { addFavorite } from '../db/repo'
import type { Category, TxType, WalletId } from '../db/schema'
import { isPointBlocked } from '../domain/points'
import Sheet from './Sheet'

/** 즐겨찾기 추가: 이름·금액·카테고리. 지갑과 지출/수입은 지금 입력 화면 상태를 따른다 */
export default function AddFavoriteSheet({
  open,
  onClose,
  type,
  walletId,
  initialAmount,
  categories,
}: {
  open: boolean
  onClose: () => void
  type: TxType
  walletId: WalletId
  initialAmount: number
  categories: Category[]
}) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>()

  useEffect(() => {
    if (open) {
      setLabel('')
      setAmount(initialAmount ? String(initialAmount) : '')
      setCategoryId(undefined)
    }
  }, [open, initialAmount])

  const amt = Number(amount.replace(/\D/g, ''))
  const valid = label.trim() && amt > 0 && categoryId

  const save = async () => {
    if (!valid || !categoryId) return
    await addFavorite({ label: label.trim(), amount: amt, categoryId, type, walletId })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`즐겨찾기 · ${walletId === 'cash' ? '💳' : '🎓'} ${type === 'expense' ? '지출' : '수입'}`}
      action={
        <button
          type="button"
          disabled={!valid}
          onClick={save}
          className="h-9 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-30"
        >
          추가
        </button>
      }
    >
      <div className="flex gap-2">
        <input
          placeholder="이름 (예: 학식)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
        />
        <input
          inputMode="numeric"
          placeholder="금액"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className="num w-28 rounded-xl border border-line bg-paper px-3 py-2.5 text-right outline-none focus:border-ink"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {categories.filter((c) => !isPointBlocked(walletId, c)).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryId(c.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              categoryId === c.id ? 'border-ink bg-ink text-paper' : 'border-line'
            }`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
