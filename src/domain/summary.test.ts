import { describe, expect, it } from 'vitest'
import type { Transaction } from '../db/schema'
import { summarizeByCategory } from './summary'

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

describe('항목별 모아보기', () => {
  const txs = [
    tx({ amount: 5000 }),
    tx({ amount: 3000, feeling: 'bad' }),
    tx({ amount: 4500, categoryId: 'exp-cafe' }),
    tx({ amount: 12000, categoryId: 'exp-cafe', walletId: 'point' }),
    tx({ amount: 999999, type: 'income', categoryId: 'inc-salary' }), // 수입 제외
  ]

  it('카테고리별 합계·건수·후회 금액, 큰 순서', () => {
    const { total, items } = summarizeByCategory(txs)
    expect(total).toBe(24500)
    expect(items.map((s) => [s.categoryId, s.total, s.count, s.regret])).toEqual([
      ['exp-cafe', 16500, 2, 0],
      ['exp-food', 8000, 2, 3000],
    ])
    expect(items[0].share).toBeCloseTo(16500 / 24500)
  })

  it('지갑으로 거른다', () => {
    expect(summarizeByCategory(txs, 'cash').total).toBe(12500)
    expect(summarizeByCategory(txs, 'point').items).toHaveLength(1)
    expect(summarizeByCategory([], 'all')).toEqual({ total: 0, items: [] })
  })
})
