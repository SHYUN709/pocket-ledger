import { addDays } from './dates'

export interface Streak {
  current: number
  best: number
  /** 오늘 이미 달성했는지 */
  today: boolean
}

/**
 * 달성한 날짜들(기록 1개 이상 또는 무지출 버튼)로 연속 일수를 센다.
 * 오늘 아직 달성 안 했어도 어제까지 이어졌으면 스트릭은 살아 있다.
 */
export function computeStreak(days: Iterable<string>, today: string): Streak {
  const set = new Set(days)
  const doneToday = set.has(today)

  let current = 0
  let d = doneToday ? today : addDays(today, -1)
  while (set.has(d)) {
    current++
    d = addDays(d, -1)
  }

  let best = 0
  for (const day of set) {
    if (set.has(addDays(day, -1))) continue // 연속 구간의 시작점에서만 센다
    let len = 0
    let x = day
    while (set.has(x)) {
      len++
      x = addDays(x, 1)
    }
    best = Math.max(best, len)
  }

  return { current, best: Math.max(best, current), today: doneToday }
}
