import { describe, expect, it } from 'vitest'
import { BackupError, exportBackup, parseBackup, restoreBackup, summarize } from './backup'
import { LedgerDB } from './schema'

const freshDb = () => new LedgerDB('backup-' + Math.random())

const tx = (id: string, amount: number) => ({
  id,
  date: '2026-11-19',
  amount,
  type: 'expense' as const,
  walletId: 'cash' as const,
  categoryId: 'exp-food',
  feeling: null,
  createdAt: 1,
})

describe('JSON 백업', () => {
  it('내보낸 걸 다른 DB로 가져오면 똑같아진다 (기존 데이터는 덮어씀)', async () => {
    const a = freshDb()
    await a.transactions.bulkAdd([tx('t1', 5000), tx('t2', 3000)])
    await a.favorites.add({ id: 'f1', label: '학식', amount: 5000, type: 'expense', walletId: 'cash', categoryId: 'exp-food', order: 0 })
    await a.categories.update('exp-etc', { name: '잡비' })

    const text = JSON.stringify(await exportBackup(a))
    const parsed = parseBackup(text)
    expect(summarize(parsed)).toMatchObject({ transactions: 2, favorites: 1, categories: 16 })

    const b = freshDb()
    await b.transactions.add(tx('old', 99999))
    await restoreBackup(parsed, b)

    expect((await b.transactions.toArray()).map((t) => t.id).sort()).toEqual(['t1', 't2'])
    expect((await b.categories.get('exp-etc'))?.name).toBe('잡비')
    expect(await b.favorites.count()).toBe(1)
  })

  it('잘못된 파일은 한국어 오류로 거절한다', () => {
    expect(() => parseBackup('not json')).toThrow('JSON 파일이 아니에요')
    expect(() => parseBackup('{"foo":1}')).toThrow('이 가계부의 백업 파일이 아니에요')
    expect(() => parseBackup(JSON.stringify({ app: 'pocket-ledger', schemaVersion: 99, data: {} }))).toThrow(
      '더 새 버전',
    )
    const bad = { app: 'pocket-ledger', schemaVersion: 1, exportedAt: '', data: { wallets: [{}], transactions: [{ id: 'x' }] } }
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(BackupError)
  })

  it('가져오기 도중 실패하면 원래 데이터가 그대로 남는다', async () => {
    const db = freshDb()
    await db.transactions.add(tx('keep', 1000))
    const backup = await exportBackup(freshDb())
    // 같은 id가 두 번 → bulkAdd 실패
    backup.data.transactions = [tx('dup', 1), tx('dup', 2)]
    await expect(restoreBackup(backup, db)).rejects.toThrow()
    expect((await db.transactions.toArray()).map((t) => t.id)).toEqual(['keep'])
  })
})
