import { useCallback, useEffect, useState } from 'react'
import AddFavoriteSheet from '../components/AddFavoriteSheet'
import BalanceHeader from '../components/BalanceHeader'
import CategoryGrid from '../components/CategoryGrid'
import FavoriteBar from '../components/FavoriteBar'
import FeelingPicker from '../components/FeelingPicker'
import Keypad from '../components/Keypad'
import Segment from '../components/Segment'
import TodayCards from '../components/TodayCards'
import { useToast } from '../components/Toast'
import { addTransaction, deleteFavorite, deleteTransaction, getSetting, setSetting, type NewTransaction } from '../db/repo'
import type { Category, Favorite, TxType, WalletId } from '../db/schema'
import { friendlyDate } from '../domain/dates'
import { josa } from '../domain/josa'
import { digitsToAmount, formatWon, pressKey } from '../domain/money'
import { couldHavePaidWithPoints, isPointBlocked, POINT_BLOCKED_LABEL } from '../domain/points'
import { useCategories, useCategoryMap, useFavorites, useLedger } from '../hooks/useData'

const LAST_WALLET = 'lastWalletId'

export default function QuickEntry() {
  const toast = useToast()
  const ledger = useLedger()
  const today = ledger?.today
  const [type, setType] = useState<TxType>('expense')
  const [walletId, setWalletId] = useState<WalletId>('cash')
  const [digits, setDigits] = useState('')
  const [memo, setMemo] = useState('')
  /** null = 오늘 */
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [stamp, setStamp] = useState<{ key: number; text: string } | null>(null)
  const [shake, setShake] = useState(0)
  const [favOpen, setFavOpen] = useState(false)

  const categories = useCategories(type)
  const favorites = useFavorites()
  const categoryMap = useCategoryMap()

  // 마지막으로 쓴 지갑을 기본값으로
  useEffect(() => {
    getSetting<WalletId>(LAST_WALLET, 'cash').then(setWalletId)
  }, [])

  const amount = digitsToAmount(digits)
  const clearStamp = useCallback(() => setStamp(null), [])

  /** 저장 공통 경로. 포인트 규칙에 막히면 저장하지 않고 false */
  const record = async (input: NewTransaction, category: Category | undefined, label: string) => {
    if (category && isPointBlocked(input.walletId, category)) {
      setShake((n) => n + 1)
      toast({ message: `${josa(category.name, '은', '는')} 포인트로 낼 수 없어요 🎓` })
      return false
    }
    const tx = await addTransaction(input)
    await setSetting(LAST_WALLET, input.walletId)
    setStamp({ key: tx.createdAt, text: `${label} ${formatWon(input.amount)}` })
    const hint =
      category && ledger && couldHavePaidWithPoints({ ...input, category, pointBalance: ledger.point })
        ? '이거 포인트로 낼 수 있었어 🎓'
        : undefined
    const isExpense = input.type === 'expense'
    toast({
      message: `${isExpense ? '지출' : '수입'} 기록 · ${label} ${formatWon(input.amount)}원`,
      detail: hint,
      // 지출은 만족·후회를 고를 시간을 준다. 안 고르면 건너뛰기
      duration: isExpense ? 5000 : 3000,
      action: { label: '되돌리기', onClick: () => deleteTransaction(tx.id) },
      extra: isExpense ? (dismiss) => <FeelingPicker txId={tx.id} onDone={dismiss} /> : undefined,
    })
    return true
  }

  const pickCategory = async (c: Category) => {
    if (amount <= 0 || !today) {
      setShake((n) => n + 1)
      return
    }
    const date = pickedDate ?? today
    const saved = await record({ date, amount, type, walletId, categoryId: c.id, memo }, c, `${c.emoji} ${c.name}`)
    if (!saved) return
    setDigits('')
    setMemo('')
    setPickedDate(null)
  }

  const recordFavorite = (f: Favorite) =>
    today &&
    record(
      { date: today, amount: f.amount, type: f.type, walletId: f.walletId, categoryId: f.categoryId, memo: f.label },
      categoryMap.get(f.categoryId),
      f.label,
    )

  const removeFavorite = (f: Favorite) => {
    if (window.confirm(`즐겨찾기 "${f.label}"을(를) 지울까요?`)) deleteFavorite(f.id)
  }

  const chooseWallet = (w: WalletId) => {
    setWalletId(w)
    setSetting(LAST_WALLET, w)
  }

  const isIncome = type === 'income'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BalanceHeader ledger={ledger} />
      <div className="perforation mx-5" />

      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-3 pb-3">
        {ledger && <TodayCards ledger={ledger} categories={categoryMap} />}

        <FavoriteBar
          favorites={favorites}
          categoryMap={categoryMap}
          onUse={recordFavorite}
          onRemove={removeFavorite}
          onAdd={() => setFavOpen(true)}
        />

        {/* 지출/수입 · 지갑 · 날짜 */}
        <div className="flex items-center gap-2">
          <Segment
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: '지출' },
              { value: 'income', label: '수입' },
            ]}
          />
          <Segment
            value={walletId}
            onChange={chooseWallet}
            options={[
              { value: 'cash', label: '💳 내 돈' },
              { value: 'point', label: '🎓 포인트' },
            ]}
          />
        </div>

        {/* 금액 */}
        <div className="relative flex items-baseline justify-end gap-1 pt-1">
          <label className="relative mr-auto flex h-8 shrink-0 items-center self-center rounded-full border border-line px-3 text-sm font-medium text-muted">
            {pickedDate && today ? friendlyDate(pickedDate, today) : '오늘'} ▾
            <input
              type="date"
              aria-label="날짜"
              value={pickedDate ?? today ?? ''}
              max={today}
              onChange={(e) => setPickedDate(e.target.value && e.target.value !== today ? e.target.value : null)}
              className="absolute inset-0 opacity-0"
            />
          </label>
          <span
            key={shake}
            className={`num text-[44px] leading-none font-bold ${shake ? 'animate-shake' : ''} ${
              amount ? (isIncome ? 'text-income' : 'text-ink') : 'text-line'
            }`}
          >
            {isIncome && amount ? '+' : ''}
            {formatWon(amount)}
          </span>
          <span className="text-xl font-semibold text-muted">원</span>
          {stamp && <Stamp key={stamp.key} text={stamp.text} onDone={clearStamp} />}
        </div>

        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (선택)"
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="h-10 rounded-xl border border-line bg-card/60 px-3 outline-none placeholder:text-muted/70 focus:border-ink"
        />

        <CategoryGrid
          categories={categories}
          onPick={pickCategory}
          disabledReason={(c) => (isPointBlocked(walletId, c) ? POINT_BLOCKED_LABEL : undefined)}
        />
      </div>

      <Keypad onKey={(k) => setDigits((d) => pressKey(d, k))} />

      <AddFavoriteSheet
        open={favOpen}
        onClose={() => setFavOpen(false)}
        type={type}
        walletId={walletId}
        initialAmount={amount}
        categories={categories}
      />
    </div>
  )
}

/** 저장 직후 금액 자리에 잠깐 찍히는 도장 */
function Stamp({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1100)
    return () => window.clearTimeout(t)
  }, [onDone])
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
      <div className="animate-stamp -rotate-3 rounded-lg border-2 border-stamp bg-paper px-3 py-1.5 text-sm font-bold text-stamp">
        기록됨 · {text}
      </div>
    </div>
  )
}
