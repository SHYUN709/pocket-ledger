import { describe, expect, it } from 'vitest'
import { couldHavePaidWithPoints, isPointBlocked } from './points'

const ok = { pointAllowed: true }
const no = { pointAllowed: false }

describe('포인트 규칙', () => {
  it('포인트 불가 카테고리는 🎓 지갑에서만 막힌다', () => {
    expect(isPointBlocked('point', no)).toBe(true)
    expect(isPointBlocked('point', ok)).toBe(false)
    expect(isPointBlocked('cash', no)).toBe(false)
  })

  it('💳 지출 + 포인트 가능 + 잔액 충분일 때만 알려준다', () => {
    const base = { walletId: 'cash' as const, type: 'expense' as const, amount: 5000, category: ok, pointBalance: 5000 }
    expect(couldHavePaidWithPoints(base)).toBe(true)
    expect(couldHavePaidWithPoints({ ...base, pointBalance: 4999 })).toBe(false)
    expect(couldHavePaidWithPoints({ ...base, category: no })).toBe(false)
    expect(couldHavePaidWithPoints({ ...base, walletId: 'point' })).toBe(false)
    expect(couldHavePaidWithPoints({ ...base, type: 'income' })).toBe(false)
  })
})

import { josa } from './josa'
describe('조사', () => {
  it('받침에 따라 은/는', () => {
    expect(josa('술자리', '은', '는')).toBe('술자리는')
    expect(josa('식비', '은', '는')).toBe('식비는')
    expect(josa('오락', '은', '는')).toBe('오락은')
  })
})
