import { describe, expect, it } from 'vitest'
import { formatWon, pressKey } from './money'
import { addDays, friendlyDate } from './dates'

describe('money', () => {
  it('천 단위 콤마', () => expect(formatWon(1234567)).toBe('1,234,567'))
  it('키패드 입력', () => {
    let d = ''
    for (const k of ['0', '5', '00', '0']) d = pressKey(d, k)
    expect(d).toBe('5000')
    expect(pressKey(d, 'back')).toBe('500')
    expect(pressKey(d, 'clear')).toBe('')
    expect(pressKey('9999999999', '1')).toBe('9999999999')
  })
})

describe('dates', () => {
  it('월말 넘어가기', () => expect(addDays('2026-02-28', 1)).toBe('2026-03-01'))
  it('친근한 날짜', () => {
    expect(friendlyDate('2026-11-19', '2026-11-19')).toBe('오늘')
    expect(friendlyDate('2026-11-18', '2026-11-19')).toBe('어제')
    expect(friendlyDate('2026-11-17', '2026-11-19')).toBe('11월 17일 (화)')
  })
})
