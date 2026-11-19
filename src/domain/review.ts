import type { Transaction } from '../db/schema'

export const REVIEW_AFTER_DAYS = 7
const DAY = 86_400_000

/** ⏳로 미뤄둔 지출 중 7일이 지난 것 (오래된 순) */
export function dueForReview(txs: Transaction[], now = Date.now()): Transaction[] {
  return txs
    .filter((t) => t.feeling === 'pending' && now - t.createdAt >= REVIEW_AFTER_DAYS * DAY)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export const FEELING_EMOJI = { good: '😊', bad: '😩', pending: '⏳', meh: '😐' } as const
