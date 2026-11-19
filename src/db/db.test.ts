import { describe, expect, it } from 'vitest'
import { LedgerDB } from './schema'

describe('DB 초기 데이터', () => {
  it('지갑 2개와 기본 카테고리가 들어간다', async () => {
    const db = new LedgerDB('test-' + Math.random())
    expect(await db.wallets.count()).toBe(2)
    const cats = await db.categories.toArray()
    expect(cats.filter((c) => c.type === 'expense')).toHaveLength(11)
    expect(cats.filter((c) => c.type === 'income')).toHaveLength(5)
    expect(cats.filter((c) => !c.pointAllowed).map((c) => c.name).sort()).toEqual(['술자리', '오락'])
  })
})
