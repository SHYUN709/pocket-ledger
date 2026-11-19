import { monthOf } from '../domain/dates'
import { db, type Category, type Favorite, type Feeling, type Recurring, type Transaction } from './schema'

export const newId = () => crypto.randomUUID()

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'feeling'> & {
  feeling?: Transaction['feeling']
}

const buildTx = (input: NewTransaction): Transaction => ({
  ...input,
  memo: input.memo?.trim() || undefined,
  feeling: input.feeling ?? null,
  id: newId(),
  createdAt: Date.now(),
})

export async function addTransaction(input: NewTransaction): Promise<Transaction> {
  const tx = buildTx(input)
  await db.transactions.add(tx)
  return tx
}

export async function updateTransaction(id: string, changes: Partial<Omit<Transaction, 'id' | 'createdAt'>>) {
  if ('memo' in changes) changes.memo = changes.memo?.trim() || undefined
  await db.transactions.update(id, changes)
}

/** 기록 삭제. 고정 항목에서 온 기록이면 확인 표시도 지워서 카드가 다시 뜨게 한다 */
export async function deleteTransaction(id: string) {
  await db.transaction('rw', db.transactions, db.recurringLog, async () => {
    await db.recurringLog.filter((l) => l.transactionId === id).delete()
    await db.transactions.delete(id)
  })
}

export const setFeeling = (id: string, feeling: Feeling) => db.transactions.update(id, { feeling })

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value })

// ── 즐겨찾기 ──
export async function addFavorite(input: Omit<Favorite, 'id' | 'order'>) {
  const last = await db.favorites.orderBy('order').last()
  await db.favorites.add({ ...input, id: newId(), order: (last?.order ?? -1) + 1 })
}

export const deleteFavorite = (id: string) => db.favorites.delete(id)

// ── 고정 항목 ──
export async function saveRecurring(r: Omit<Recurring, 'id'> & { id?: string }) {
  await db.recurring.put({ ...r, id: r.id ?? newId() })
}

export async function deleteRecurring(id: string) {
  await db.transaction('rw', db.recurring, db.recurringLog, async () => {
    await db.recurring.delete(id)
    await db.recurringLog.filter((l) => l.recurringId === id).delete()
  })
}

/** 확인 카드 → 기록. 금액은 이번 달만 바꿀 수 있다 */
export async function confirmRecurring(r: Recurring, amount: number, date: string): Promise<Transaction> {
  const tx = buildTx({
    date,
    amount,
    type: r.type,
    walletId: r.walletId,
    categoryId: r.categoryId,
    memo: r.name,
    recurringId: r.id,
  })
  await db.transaction('rw', db.transactions, db.recurringLog, async () => {
    await db.transactions.add(tx)
    await db.recurringLog.put({ recurringId: r.id, month: monthOf(date), status: 'recorded', transactionId: tx.id })
  })
  return tx
}

export const skipRecurring = (r: Recurring, month: string) =>
  db.recurringLog.put({ recurringId: r.id, month, status: 'skipped' })

export const unskipRecurring = (r: Recurring, month: string) => db.recurringLog.delete([r.id, month])

// ── 무지출 ──
export const markNoSpend = (date: string) => db.noSpendDays.put({ date })
export const unmarkNoSpend = (date: string) => db.noSpendDays.delete(date)

// ── 카테고리 ──
export async function saveCategory(c: Omit<Category, 'id' | 'order' | 'archived'> & { id?: string }) {
  if (c.id) {
    await db.categories.update(c.id, { name: c.name, emoji: c.emoji, pointAllowed: c.pointAllowed })
    return
  }
  const last = await db.categories.orderBy('order').last()
  await db.categories.add({ ...c, id: newId(), order: (last?.order ?? -1) + 1, archived: false })
}

/** 지우지 않고 숨긴다 — 옛 기록은 그대로 카테고리를 보여준다 */
export const archiveCategory = (id: string) => db.categories.update(id, { archived: true })

/** 지운 기록 되살리기 (되돌리기용). 고정 항목에서 온 기록이면 확인 표시도 다시 */
export async function restoreTransaction(tx: Transaction) {
  await db.transaction('rw', db.transactions, db.recurringLog, async () => {
    await db.transactions.put(tx)
    if (tx.recurringId) {
      await db.recurringLog.put({ recurringId: tx.recurringId, month: monthOf(tx.date), status: 'recorded', transactionId: tx.id })
    }
  })
}
