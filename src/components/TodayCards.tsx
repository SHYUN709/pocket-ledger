import { useState } from 'react'
import {
  confirmRecurring,
  deleteTransaction,
  markNoSpend,
  setFeeling,
  skipRecurring,
  unmarkNoSpend,
  unskipRecurring,
} from '../db/repo'
import type { Category, Recurring } from '../db/schema'
import { friendlyDate } from '../domain/dates'
import { formatWon } from '../domain/money'
import { dueDate } from '../domain/recurring'
import { FEELING_EMOJI } from '../domain/review'
import type { Ledger } from '../hooks/useData'
import Sheet from './Sheet'
import { useToast } from './Toast'

/** 메인 화면 알림 카드 줄: 고정 항목 확인 · 다시 판정 · 오늘 무지출 */
export default function TodayCards({ ledger, categories }: { ledger: Ledger; categories: Map<string, Category> }) {
  const toast = useToast()
  const [confirming, setConfirming] = useState<Recurring | null>(null)
  const showNoSpend = !ledger.streak.today && !ledger.noSpendToday

  if (!ledger.due.length && !ledger.review.length && !showNoSpend) return null

  const noSpend = async () => {
    await markNoSpend(ledger.today)
    toast({ message: '🙌 오늘 무지출 달성!', action: { label: '되돌리기', onClick: () => unmarkNoSpend(ledger.today) } })
  }

  return (
    <>
      <div className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto px-5">
        {ledger.due.map((r) => {
          const c = categories.get(r.categoryId)
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setConfirming(r)}
              className="flex w-[210px] shrink-0 snap-start flex-col rounded-2xl border border-ink/80 bg-card px-3.5 py-2.5 text-left active:scale-[0.98]"
            >
              <span className="text-[11px] font-semibold text-muted">
                📌 고정 · {friendlyDate(dueDate(r, ledger.today.slice(0, 7)), ledger.today)}
              </span>
              <span className="mt-0.5 text-sm font-semibold">
                {c?.emoji} {r.name} {r.type === 'expense' ? '나갈 날이야' : '들어올 날이야'}
              </span>
              <span className={`num mt-0.5 text-base font-bold ${r.type === 'income' ? 'text-income' : ''}`}>
                {r.type === 'income' ? '+' : ''}
                {formatWon(r.amount)}원 <span className="text-xs font-medium text-muted">· 탭해서 기록</span>
              </span>
            </button>
          )
        })}

        {ledger.review.map((t) => {
          const c = categories.get(t.categoryId)
          return (
            <div key={t.id} className="flex w-[210px] shrink-0 snap-start flex-col rounded-2xl border border-line bg-card px-3.5 py-2.5">
              <span className="text-[11px] font-semibold text-muted">⏳ 다시 판정 · {friendlyDate(t.date, ledger.today)}</span>
              <span className="mt-0.5 truncate text-sm font-semibold">
                {c?.emoji} {t.memo || c?.name} <span className="num">{formatWon(t.amount)}원</span>
              </span>
              <span className="mt-1.5 flex gap-1.5">
                {(['good', 'bad', 'meh'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFeeling(t.id, f)}
                    className="flex h-11 flex-1 flex-col items-center justify-center rounded-xl bg-paper text-[10px] leading-tight font-medium whitespace-nowrap active:scale-95"
                  >
                    <span className="text-lg leading-none">{FEELING_EMOJI[f]}</span>
                    {f === 'good' ? '잘 썼어' : f === 'bad' ? '후회' : '그냥 그럼'}
                  </button>
                ))}
              </span>
            </div>
          )
        })}

        {showNoSpend && (
          <div className="flex w-[210px] shrink-0 snap-start flex-col rounded-2xl border border-dashed border-line px-3.5 py-2.5">
            <span className="text-[11px] font-semibold text-muted">🕯️ 오늘 아직 기록이 없어요</span>
            <span className="mt-0.5 text-sm font-semibold">오늘 쓴 돈 없어?</span>
            <button
              type="button"
              onClick={noSpend}
              className="mt-1.5 h-8 rounded-full bg-ink text-xs font-semibold text-paper active:scale-95"
            >
              🙌 오늘 무지출
            </button>
          </div>
        )}
      </div>

      <ConfirmRecurringSheet
        recurring={confirming}
        category={confirming ? categories.get(confirming.categoryId) : undefined}
        month={ledger.today.slice(0, 7)}
        onClose={() => setConfirming(null)}
      />
    </>
  )
}

function ConfirmRecurringSheet({
  recurring: r,
  category,
  month,
  onClose,
}: {
  recurring: Recurring | null
  category?: Category
  month: string
  onClose: () => void
}) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [openedFor, setOpenedFor] = useState<string | null>(null)

  // 시트가 새 항목으로 열릴 때 금액을 기본값으로
  if (r && openedFor !== r.id) {
    setOpenedFor(r.id)
    setAmount(String(r.amount))
  }
  if (!r && openedFor !== null) setOpenedFor(null)

  const amt = Number(amount || 0)

  const record = async () => {
    if (!r || amt <= 0) return
    const tx = await confirmRecurring(r, amt, dueDate(r, month))
    toast({
      message: `${r.name} ${formatWon(amt)}원 기록했어요`,
      action: { label: '되돌리기', onClick: () => deleteTransaction(tx.id) },
    })
    onClose()
  }

  const skip = async () => {
    if (!r) return
    await skipRecurring(r, month)
    toast({ message: `${r.name}: 이번 달은 건너뛰어요`, action: { label: '되돌리기', onClick: () => unskipRecurring(r, month) } })
    onClose()
  }

  return (
    <Sheet open={!!r} onClose={onClose} title={r ? `${category?.emoji ?? '📌'} ${r.name}` : ''}>
      {r && (
        <>
          <p className="text-sm text-muted">
            매달 {r.dayOfMonth}일 · {r.walletId === 'cash' ? '💳 내 돈' : '🎓 포인트'} ·{' '}
            {r.type === 'expense' ? '지출' : '수입'}
          </p>
          <label className="mt-4 flex items-baseline gap-2 rounded-2xl border border-line bg-paper px-4 py-3 focus-within:border-ink">
            <span className="text-sm text-muted">이번 달 금액</span>
            <input
              inputMode="numeric"
              value={amt ? formatWon(amt) : ''}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="num min-w-0 flex-1 bg-transparent text-right text-2xl font-bold outline-none"
            />
            <span className="font-semibold text-muted">원</span>
          </label>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={skip} className="h-12 flex-1 rounded-2xl border border-line font-semibold">
              이번 달 건너뛰기
            </button>
            <button
              type="button"
              disabled={amt <= 0}
              onClick={record}
              className="h-12 flex-[1.4] rounded-2xl bg-ink font-semibold text-paper disabled:opacity-30"
            >
              기록하기
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
