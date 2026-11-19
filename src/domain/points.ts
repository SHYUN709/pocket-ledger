import type { Category, TxType, WalletId } from '../db/schema'

export const POINT_BLOCKED_LABEL = '포인트 사용 불가'

/** 🎓 지갑으로 이 카테고리를 기록할 수 없으면 true */
export const isPointBlocked = (walletId: WalletId, category: Pick<Category, 'pointAllowed'>) =>
  walletId === 'point' && !category.pointAllowed

/** 💳로 낸 지출인데 포인트로도 낼 수 있었으면 true */
export function couldHavePaidWithPoints(input: {
  walletId: WalletId
  type: TxType
  amount: number
  category: Pick<Category, 'pointAllowed'>
  pointBalance: number
}): boolean {
  return (
    input.walletId === 'cash' &&
    input.type === 'expense' &&
    input.category.pointAllowed &&
    input.amount > 0 &&
    input.pointBalance >= input.amount
  )
}
