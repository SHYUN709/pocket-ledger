import { describe, expect, it } from 'vitest'
import { badgeValue } from './badge'

describe('앱 아이콘 배지 숫자', () => {
  it('끄면 0', () => expect(badgeValue('off', { streak: 5, remaining: 500000 })).toBe(0))
  it('연속 일수', () => expect(badgeValue('streak', { streak: 12, remaining: 0 })).toBe(12))
  it('남은 돈은 만 원 단위 내림, 마이너스·만 원 미만은 0', () => {
    expect(badgeValue('remaining', { streak: 0, remaining: 513300 })).toBe(51)
    expect(badgeValue('remaining', { streak: 0, remaining: 9999 })).toBe(0)
    expect(badgeValue('remaining', { streak: 0, remaining: -20000 })).toBe(0)
  })
})
