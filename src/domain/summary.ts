import type { Transaction, WalletId } from '../db/schema'

export type WalletFilter = 'all' | WalletId

export interface CategorySummary {
  categoryId: string
  total: number
  count: number
  /** 그중 😩 후회로 표시한 금액 */
  regret: number
  /** 전체 지출 대비 비율 0~1 */
  share: number
}

/** 지출을 카테고리별로 모아 큰 순서로. 수입은 제외 */
export function summarizeByCategory(
  txs: Transaction[],
  wallet: WalletFilter = 'all',
): {
  total: number
  items: CategorySummary[]
} {
  const map = new Map<string, CategorySummary>()
  let total = 0
  for (const t of txs) {
    if (t.type !== 'expense') continue
    if (wallet !== 'all' && t.walletId !== wallet) continue
    let s = map.get(t.categoryId)
    if (!s) map.set(t.categoryId, (s = { categoryId: t.categoryId, total: 0, count: 0, regret: 0, share: 0 }))
    s.total += t.amount
    s.count++
    if (t.feeling === 'bad') s.regret += t.amount
    total += t.amount
  }
  const items = [...map.values()].sort((a, b) => b.total - a.total || b.count - a.count)
  for (const s of items) s.share = total ? s.total / total : 0
  return { total, items }
}
