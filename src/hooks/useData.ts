import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type TxType } from '../db/schema'
import { walletNet } from '../domain/balance'
import { toDateKey, todayKey } from '../domain/dates'
import { cashRemaining, dueToday } from '../domain/recurring'
import { dueForReview } from '../domain/review'
import { computeStreak } from '../domain/streak'

export function useCategories(type?: TxType) {
  return (
    useLiveQuery(async () => {
      const all = await db.categories.orderBy('order').toArray()
      return all.filter((c) => !c.archived && (!type || c.type === type))
    }, [type]) ?? []
  )
}

/** 숨긴 카테고리 포함 — 옛 기록 표시용 */
export function useCategoryMap() {
  const all = useLiveQuery(() => db.categories.toArray()) ?? []
  return new Map(all.map((c) => [c.id, c]))
}

export function useFavorites() {
  return useLiveQuery(() => db.favorites.orderBy('order').toArray()) ?? []
}

export function useTransactions() {
  return useLiveQuery(() => db.transactions.toArray())
}

export function useRecurring() {
  return useLiveQuery(() => db.recurring.toArray()) ?? []
}

/** 자정이 지나면 화면의 "오늘"도 바뀌도록 (앱을 켜둔 채 날이 바뀌는 경우) */
export function useToday() {
  const [today, setToday] = useState(todayKey)
  useEffect(() => {
    const tick = () => setToday(todayKey())
    const id = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return today
}

/** 메인 화면에 필요한 계산을 한 번에 */
export function useLedger() {
  const today = useToday()
  const data = useLiveQuery(async () => {
    const [txs, recurring, logs, noSpend] = await Promise.all([
      db.transactions.toArray(),
      db.recurring.toArray(),
      db.recurringLog.toArray(),
      db.noSpendDays.toArray(),
    ])
    return { txs, recurring, logs, noSpend }
  })
  if (!data) return null

  const { txs, recurring, logs, noSpend } = data
  const month = today.slice(0, 7)
  // 스트릭은 '기록하는 습관' 기준: 어제 쓴 돈을 오늘 적어도 오늘 달성으로 친다
  const days = [...txs.map((t) => toDateKey(new Date(t.createdAt))), ...noSpend.map((n) => n.date)]
  return {
    today,
    txs,
    cash: cashRemaining(txs, recurring, logs, month),
    point: walletNet(txs, 'point'),
    due: dueToday(recurring, logs, today),
    review: dueForReview(txs),
    streak: computeStreak(days, today),
    noSpendToday: noSpend.some((n) => n.date === today),
  }
}

export type Ledger = NonNullable<ReturnType<typeof useLedger>>
