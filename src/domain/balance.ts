import type { Transaction, WalletId } from '../db/schema'

const signed = (t: Pick<Transaction, 'type' | 'amount'>) => (t.type === 'income' ? t.amount : -t.amount)

/** 지갑 잔액 합계 (수입 − 지출). month를 주면 그달만 */
export function walletNet(txs: Transaction[], walletId: WalletId, month?: string): number {
  let sum = 0
  for (const t of txs) {
    if (t.walletId !== walletId) continue
    if (month && !t.date.startsWith(month)) continue
    sum += signed(t)
  }
  return sum
}
