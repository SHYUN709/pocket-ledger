const pad = (n: number) => String(n).padStart(2, '0')

/** 현지 시간 기준 YYYY-MM-DD */
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayKey = () => toDateKey(new Date())

/** YYYY-MM-DD → YYYY-MM */
export const monthOf = (dateKey: string) => dateKey.slice(0, 7)

export const parseDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (key: string, days: number) => {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

/** "오늘" · "어제" · "11월 17일 (월)" */
export function friendlyDate(key: string, today = todayKey()): string {
  if (key === today) return '오늘'
  if (key === addDays(today, -1)) return '어제'
  const d = parseDateKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`
}
