import type { Recurring, RecurringLog, Transaction } from '../db/schema'
import { walletNet } from './balance'

const pad = (n: number) => String(n).padStart(2, '0')

/** 그달의 마지막 날 (month: YYYY-MM) */
export const lastDayOf = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** 31일로 정해둔 항목은 2월엔 28(29)일로 */
export const dueDate = (r: Pick<Recurring, 'dayOfMonth'>, month: string) =>
  `${month}-${pad(Math.min(r.dayOfMonth, lastDayOf(month)))}`

const logKey = (recurringId: string, month: string) => `${recurringId}|${month}`

/** 이번 달 아직 기록도 건너뛰기도 안 한 고정 항목 */
export function unconfirmed(recurring: Recurring[], logs: RecurringLog[], month: string): Recurring[] {
  const done = new Set(logs.filter((l) => l.month === month).map((l) => logKey(l.recurringId, l.month)))
  return recurring.filter((r) => !done.has(logKey(r.id, month)))
}

/** 확인 카드로 띄울 항목: 확인 안 됐고 날짜가 됐거나 지난 것 (날짜순) */
export function dueToday(recurring: Recurring[], logs: RecurringLog[], today: string): Recurring[] {
  const month = today.slice(0, 7)
  return unconfirmed(recurring, logs, month)
    .filter((r) => dueDate(r, month) <= today)
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
}

export interface CashRemaining {
  /** 화면에 보일 💳 이번 달 남은 돈 */
  remaining: number
  /** 그중 실제로 기록된 수입 − 지출 */
  actual: number
  /** 아직 확인 안 된 고정 수입 − 고정 지출 */
  pending: number
}

/**
 * 💳 이번 달 남은 돈 = 이번 달 💳 수입 + 확인 안 된 💳 고정 수입
 *                    − 이번 달 💳 지출 − 확인 안 된 💳 고정 지출
 */
export function cashRemaining(
  txs: Transaction[],
  recurring: Recurring[],
  logs: RecurringLog[],
  month: string,
): CashRemaining {
  const actual = walletNet(txs, 'cash', month)
  let pending = 0
  for (const r of unconfirmed(recurring, logs, month)) {
    if (r.walletId !== 'cash') continue
    pending += r.type === 'income' ? r.amount : -r.amount
  }
  return { remaining: actual + pending, actual, pending }
}
