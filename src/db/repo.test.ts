import { beforeEach, describe, expect, it } from 'vitest'
import { dueToday } from '../domain/recurring'
import { confirmRecurring, deleteTransaction, restoreTransaction, saveRecurring, skipRecurring } from './repo'
import { db } from './schema'

describe('고정 항목 확인 흐름', () => {
  beforeEach(async () => {
    await Promise.all([db.recurring.clear(), db.recurringLog.clear(), db.transactions.clear()])
    await saveRecurring({ id: 'phone', name: '통신비', amount: 55000, type: 'expense', walletId: 'cash', categoryId: 'exp-phone', dayOfMonth: 25 })
  })

  const due = async (today: string) => dueToday(await db.recurring.toArray(), await db.recurringLog.toArray(), today)

  it('기록하면 카드가 사라지고, 기록을 지우면 다시 뜬다', async () => {
    const r = (await db.recurring.get('phone'))!
    expect(await due('2026-11-25')).toHaveLength(1)
    const tx = await confirmRecurring(r, 49000, '2026-11-25')
    expect(tx).toMatchObject({ amount: 49000, recurringId: 'phone', memo: '통신비' })
    expect(await due('2026-11-25')).toHaveLength(0)

    await deleteTransaction(tx.id)
    expect(await due('2026-11-25')).toHaveLength(1)

    await restoreTransaction(tx)
    expect(await due('2026-11-25')).toHaveLength(0)
  })

  it('건너뛰면 이번 달만 안 뜬다', async () => {
    const r = (await db.recurring.get('phone'))!
    await skipRecurring(r, '2026-11')
    expect(await due('2026-11-30')).toHaveLength(0)
    expect(await due('2026-12-25')).toHaveLength(1)
    expect(await db.transactions.count()).toBe(0)
  })
})
