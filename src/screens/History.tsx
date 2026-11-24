import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import Segment from '../components/Segment'
import Sheet from '../components/Sheet'
import { useToast } from '../components/Toast'
import { deleteTransaction, restoreTransaction, updateTransaction } from '../db/repo'
import { db, type Category, type Feeling, type Transaction } from '../db/schema'
import { friendlyDate } from '../domain/dates'
import { formatWon } from '../domain/money'
import { isPointBlocked, POINT_BLOCKED_LABEL } from '../domain/points'
import { FEELING_EMOJI } from '../domain/review'
import { summarizeByCategory, type WalletFilter } from '../domain/summary'
import { useCategoryMap, useToday } from '../hooks/useData'
import { CategoryChips } from './Managers'

const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function History() {
  const today = useToday()
  const thisMonth = today.slice(0, 7)
  const [month, setMonth] = useState(thisMonth)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [view, setView] = useState<'list' | 'category'>('list')
  /** 항목별 보기에서 탭한 카테고리만 날짜별 목록으로 */
  const [onlyCategory, setOnlyCategory] = useState<string | null>(null)
  const [wallet, setWallet] = useState<WalletFilter>('all')
  const cats = useCategoryMap()

  const txs =
    useLiveQuery(
      () => db.transactions.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray(),
      [month],
    ) ?? []

  const { groups, totals } = useMemo(() => {
    const sorted = txs
      .filter((t) => !onlyCategory || t.categoryId === onlyCategory)
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
    const groups: { date: string; items: Transaction[]; spent: number }[] = []
    const totals = { cashOut: 0, cashIn: 0, pointOut: 0 }
    for (const t of sorted) {
      let g = groups[groups.length - 1]
      if (!g || g.date !== t.date) groups.push((g = { date: t.date, items: [], spent: 0 }))
      g.items.push(t)
      if (t.type === 'expense') g.spent += t.amount
    }
    // 위 합계 카드는 카테고리로 걸러 봐도 항상 이달 전체 기준
    for (const t of txs) {
      if (t.walletId === 'cash') t.type === 'expense' ? (totals.cashOut += t.amount) : (totals.cashIn += t.amount)
      else if (t.type === 'expense') totals.pointOut += t.amount
    }
    return { groups, totals }
  }, [txs, onlyCategory])

  const summary = useMemo(() => summarizeByCategory(txs, wallet), [txs, wallet])
  const filterCat = onlyCategory ? cats.get(onlyCategory) : undefined

  const [y, m] = month.split('-').map(Number)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          aria-label="이전 달"
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="h-9 w-9 rounded-full text-xl active:bg-card"
        >
          ‹
        </button>
        <h1 className="text-xl font-bold">
          {y !== Number(today.slice(0, 4)) && `${y}년 `}
          {m}월
        </h1>
        <button
          type="button"
          aria-label="다음 달"
          disabled={month >= thisMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="h-9 w-9 rounded-full text-xl active:bg-card disabled:opacity-20"
        >
          ›
        </button>
      </div>

      <div className="mx-5 grid grid-cols-3 gap-2 rounded-2xl border border-line bg-card px-3 py-2.5 text-center">
        <Total label="💳 지출" value={totals.cashOut} />
        <Total label="💳 수입" value={totals.cashIn} className="text-income" />
        <Total label="🎓 사용" value={totals.pointOut} className="text-point" />
      </div>

      <div className="mx-5 mt-3">
        <Segment
          full
          value={view}
          onChange={(v) => {
            setView(v)
            setOnlyCategory(null)
          }}
          options={[
            { value: 'list', label: '날짜별' },
            { value: 'category', label: '항목별' },
          ]}
        />
      </div>

      {view === 'category' ? (
        <CategoryBreakdown
          summary={summary}
          wallet={wallet}
          onWallet={setWallet}
          categories={cats}
          onPick={(id) => {
            setOnlyCategory(id)
            setView('list')
          }}
        />
      ) : (
        <div className="no-scrollbar mt-2 flex-1 overflow-y-auto px-5 pb-6">
          {filterCat && (
            <button
              type="button"
              onClick={() => {
                setOnlyCategory(null)
                setView('category')
              }}
              className="mt-2 flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper"
            >
              {filterCat.emoji} {filterCat.name}만 보는 중 <span className="opacity-70">✕</span>
            </button>
          )}
          {groups.length === 0 && <p className="py-16 text-center text-sm text-muted">이달 기록이 없어요</p>}
          {groups.map((g) => (
            <section key={g.date} className="mt-4">
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="text-sm font-bold">{friendlyDate(g.date, today)}</h2>
                {g.spent > 0 && <span className="num text-xs text-muted">−{formatWon(g.spent)}</span>}
              </div>
              <div className="perforation" />
              {g.items.map((t) => {
                const c = cats.get(t.categoryId)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditing(t)}
                    className="flex w-full items-center gap-3 py-2.5 text-left active:bg-card"
                  >
                    <span className="w-7 text-center text-xl">{c?.emoji ?? '❔'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {t.memo || c?.name || '알 수 없음'}
                        {t.feeling && <span className="ml-1">{FEELING_EMOJI[t.feeling]}</span>}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {t.walletId === 'cash' ? '💳 내 돈' : '🎓 포인트'}
                        {t.memo && c && ` · ${c.name}`}
                        {t.recurringId && ' · 📌 고정'}
                      </span>
                    </span>
                    <span
                      className={`num shrink-0 font-semibold ${
                        t.type === 'income' ? 'text-income' : t.walletId === 'point' ? 'text-point' : ''
                      }`}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {formatWon(t.amount)}
                    </span>
                  </button>
                )
              })}
            </section>
          ))}
        </div>
      )}

      {editing && <EditTransactionSheet tx={editing} categories={cats} onClose={() => setEditing(null)} />}
    </div>
  )
}

function CategoryBreakdown({
  summary,
  wallet,
  onWallet,
  categories,
  onPick,
}: {
  summary: ReturnType<typeof summarizeByCategory>
  wallet: WalletFilter
  onWallet: (w: WalletFilter) => void
  categories: Map<string, Category>
  onPick: (categoryId: string) => void
}) {
  const regretTotal = summary.items.reduce((n, s) => n + s.regret, 0)
  return (
    <div className="no-scrollbar mt-3 flex-1 overflow-y-auto px-5 pb-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] text-muted">이달 지출</div>
          <div className="num text-xl font-bold">{formatWon(summary.total)}원</div>
        </div>
        <Segment
          value={wallet}
          onChange={onWallet}
          options={[
            { value: 'all', label: '전체' },
            { value: 'cash', label: '💳' },
            { value: 'point', label: '🎓' },
          ]}
        />
      </div>
      {regretTotal > 0 && (
        <p className="mt-1 text-xs text-muted">
          그중 😩 후회 <span className="num font-semibold text-stamp">{formatWon(regretTotal)}원</span>
        </p>
      )}
      <div className="perforation mt-3" />

      {summary.items.length === 0 && <p className="py-16 text-center text-sm text-muted">이달 지출이 없어요</p>}
      {summary.items.map((s) => {
        const c = categories.get(s.categoryId)
        const pct = Math.round(s.share * 100)
        return (
          <button
            key={s.categoryId}
            type="button"
            onClick={() => onPick(s.categoryId)}
            className="w-full border-b border-line py-3 text-left last:border-b-0 active:bg-card"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 text-center text-xl">{c?.emoji ?? '❔'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{c?.name ?? '알 수 없음'}</span>
                <span className="block text-xs text-muted">
                  {s.count}건{s.regret > 0 && <span className="text-stamp"> · 😩 {formatWon(s.regret)}</span>}
                </span>
              </span>
              <span className="text-right">
                <span className="num block font-semibold">{formatWon(s.total)}</span>
                <span className="num block text-xs text-muted">{pct < 1 ? '1% 미만' : `${pct}%`}</span>
              </span>
            </div>
            <div className="mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full bg-ink/70" style={{ width: `${Math.max(2, s.share * 100)}%` }} />
            </div>
          </button>
        )
      })}
      {summary.items.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted">항목을 누르면 그 기록만 모아 봐요</p>
      )}
    </div>
  )
}

function Total({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`num text-[15px] font-bold ${className}`}>{formatWon(value)}</div>
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink'

const FEELINGS: { value: Feeling; label: string }[] = [
  { value: null, label: '—' },
  { value: 'good', label: '😊' },
  { value: 'bad', label: '😩' },
  { value: 'meh', label: '😐' },
  { value: 'pending', label: '⏳' },
]

function EditTransactionSheet({
  tx,
  categories,
  onClose,
}: {
  tx: Transaction
  categories: Map<string, Category>
  onClose: () => void
}) {
  const toast = useToast()
  const [d, setD] = useState(tx)
  const set = (p: Partial<Transaction>) => setD((x) => ({ ...x, ...p }))

  // 숨긴 카테고리라도 지금 기록의 카테고리는 보여준다
  const options = [...categories.values()]
    .filter((c) => c.type === d.type && (!c.archived || c.id === tx.categoryId))
    .sort((a, b) => a.order - b.order)
  const category = categories.get(d.categoryId)
  const blocked = category && isPointBlocked(d.walletId, category)
  const valid = d.amount > 0 && category?.type === d.type && !blocked && /^\d{4}-\d{2}-\d{2}$/.test(d.date)

  const save = async () => {
    if (!valid) return
    const { id, createdAt, ...changes } = d
    void createdAt
    await updateTransaction(id, changes)
    onClose()
  }

  const remove = async () => {
    if (!window.confirm('이 기록을 지울까요?')) return
    await deleteTransaction(tx.id)
    toast({
      message: '기록을 지웠어요',
      action: { label: '되돌리기', onClick: () => restoreTransaction(tx) },
    })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="기록 수정"
      action={
        <button
          type="button"
          disabled={!valid}
          onClick={save}
          className="h-9 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-30"
        >
          저장
        </button>
      }
    >
      <div className="mb-3 flex gap-2">
        <Segment
          full
          value={d.type}
          onChange={(type) => set({ type, categoryId: type === tx.type ? tx.categoryId : '' })}
          options={[
            { value: 'expense', label: '지출' },
            { value: 'income', label: '수입' },
          ]}
        />
        <Segment
          full
          value={d.walletId}
          onChange={(walletId) => set({ walletId })}
          options={[
            { value: 'cash', label: '💳 내 돈' },
            { value: 'point', label: '🎓 포인트' },
          ]}
        />
      </div>
      <div className="mb-3 flex gap-2">
        <label className="flex min-w-0 flex-1 items-baseline gap-1 rounded-xl border border-line bg-paper px-3 py-2 focus-within:border-ink">
          <input
            inputMode="numeric"
            aria-label="금액"
            value={d.amount ? formatWon(d.amount) : ''}
            onChange={(e) => set({ amount: Number(e.target.value.replace(/\D/g, '').slice(0, 10)) })}
            className="num min-w-0 flex-1 bg-transparent text-right text-xl font-bold outline-none"
          />
          <span className="text-muted">원</span>
        </label>
        <input
          type="date"
          aria-label="날짜"
          value={d.date}
          onChange={(e) => set({ date: e.target.value })}
          className={`${inputCls} !w-[140px] shrink-0 px-2`}
        />
      </div>
      <input
        className={`${inputCls} mb-3`}
        placeholder="메모 (선택)"
        value={d.memo ?? ''}
        onChange={(e) => set({ memo: e.target.value })}
      />
      <CategoryChips categories={options} value={d.categoryId} onChange={(categoryId) => set({ categoryId })} />
      {blocked && <p className="mt-2 text-sm font-semibold text-stamp">🎓 {POINT_BLOCKED_LABEL} 카테고리예요</p>}

      {d.type === 'expense' && (
        <div className="mt-4">
          <span className="mb-1 block text-xs font-semibold text-muted">어땠어?</span>
          <div className="flex gap-1.5">
            {FEELINGS.map((f) => (
              <button
                key={String(f.value)}
                type="button"
                onClick={() => set({ feeling: f.value })}
                className={`h-10 flex-1 rounded-xl border text-lg ${d.feeling === f.value ? 'border-ink bg-raised' : 'border-line'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={remove} className="mt-6 w-full py-2 text-sm font-semibold text-stamp">
        이 기록 지우기
      </button>
    </Sheet>
  )
}
