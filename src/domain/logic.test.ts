import { describe, expect, it } from 'vitest'
import type { Recurring, RecurringLog, Transaction } from '../db/schema'
import { cashRemaining, dueDate, dueToday } from './recurring'
import { dueForReview } from './review'
import { computeStreak } from './streak'

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(),
  date: '2026-11-10',
  amount: 1000,
  type: 'expense',
  walletId: 'cash',
  categoryId: 'exp-food',
  feeling: null,
  createdAt: 0,
  ...p,
})

const rec = (p: Partial<Recurring>): Recurring => ({
  id: 'r',
  name: '통신비',
  amount: 55000,
  type: 'expense',
  walletId: 'cash',
  categoryId: 'exp-phone',
  dayOfMonth: 25,
  ...p,
})

describe('고정 항목', () => {
  it('없는 날은 말일로', () => {
    expect(dueDate({ dayOfMonth: 31 }, '2026-02')).toBe('2026-02-28')
    expect(dueDate({ dayOfMonth: 31 }, '2028-02')).toBe('2028-02-29')
    expect(dueDate({ dayOfMonth: 5 }, '2026-11')).toBe('2026-11-05')
  })

  it('날짜가 됐고 확인 안 된 것만 카드로', () => {
    const list = [rec({ id: 'a', dayOfMonth: 10 }), rec({ id: 'b', dayOfMonth: 20 }), rec({ id: 'c', dayOfMonth: 1 })]
    const logs: RecurringLog[] = [{ recurringId: 'c', month: '2026-11', status: 'recorded' }]
    expect(dueToday(list, logs, '2026-11-15').map((r) => r.id)).toEqual(['a'])
    // 지난달 확인 기록은 이번 달과 상관없다
    expect(dueToday(list, [{ recurringId: 'a', month: '2026-10', status: 'skipped' }], '2026-11-10').map((r) => r.id)).toEqual([
      'c',
      'a',
    ])
  })

  it('남은 돈 = 💳 실제 + 확인 안 된 💳 고정 수입 − 고정 지출', () => {
    const txs = [
      tx({ type: 'income', amount: 300000 }),
      tx({ amount: 20000 }),
      tx({ amount: 9999, walletId: 'point' }), // 포인트는 제외
      tx({ amount: 7777, date: '2026-10-31' }), // 지난달 제외
    ]
    const list = [
      rec({ id: 'phone', amount: 55000 }),
      rec({ id: 'salary', type: 'income', amount: 500000, categoryId: 'inc-salary' }),
      rec({ id: 'sub', amount: 10000 }),
      rec({ id: 'scholar', type: 'income', walletId: 'point', amount: 450000 }), // 포인트 고정은 제외
    ]
    const logs: RecurringLog[] = [{ recurringId: 'sub', month: '2026-11', status: 'recorded' }]
    expect(cashRemaining(txs, list, logs, '2026-11')).toEqual({
      actual: 280000,
      pending: 500000 - 55000,
      remaining: 280000 + 445000,
    })
  })
})

describe('스트릭', () => {
  it('오늘 안 했어도 어제까지 이어지면 유지', () => {
    expect(computeStreak(['2026-11-17', '2026-11-18'], '2026-11-19')).toEqual({ current: 2, best: 2, today: false })
  })
  it('하루 비면 끊긴다, 최고 기록은 남는다', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-18', '2026-11-19']
    expect(computeStreak(days, '2026-11-19')).toEqual({ current: 2, best: 3, today: true })
    expect(computeStreak(days, '2026-11-21')).toMatchObject({ current: 0, best: 3 })
  })
  it('월말을 넘어 이어진다', () => {
    expect(computeStreak(['2026-10-30', '2026-10-31', '2026-11-01'], '2026-11-01').current).toBe(3)
  })
})

describe('다시 판정', () => {
  it('⏳이고 7일 지난 것만', () => {
    const now = 10 * 86_400_000
    const list = [
      tx({ id: 'old', feeling: 'pending', createdAt: now - 7 * 86_400_000 }),
      tx({ id: 'new', feeling: 'pending', createdAt: now - 6 * 86_400_000 }),
      tx({ id: 'done', feeling: 'good', createdAt: 0 }),
    ]
    expect(dueForReview(list, now).map((t) => t.id)).toEqual(['old'])
  })
})
