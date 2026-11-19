const fmt = new Intl.NumberFormat('ko-KR')

/** 12345 → "12,345" */
export const formatWon = (n: number) => fmt.format(n)

export const MAX_DIGITS = 10

/** 키패드 입력: 현재 숫자 문자열에 키를 더한다. 앞자리 0과 자릿수 초과는 무시 */
export function pressKey(current: string, key: string): string {
  if (key === 'back') return current.slice(0, -1)
  if (key === 'clear') return ''
  if (!/^\d+$/.test(key)) return current
  const next = (current + key).replace(/^0+/, '')
  return next.length > MAX_DIGITS ? current : next
}

export const digitsToAmount = (digits: string) => (digits ? Number(digits) : 0)
