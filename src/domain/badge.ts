export type BadgeMode = 'off' | 'streak' | 'remaining'

export const BADGE_SETTING = 'badgeMode'

/**
 * 앱 아이콘에 띄울 숫자. 0이면 배지를 지운다 (iOS 배지는 양의 정수만 의미가 있다).
 * - streak: 연속 기록 일수
 * - remaining: 💳 이번 달 남은 돈을 만 원 단위로 내림 (예: 513,300원 → 51). 마이너스면 지움
 */
export function badgeValue(mode: BadgeMode, data: { streak: number; remaining: number }): number {
  if (mode === 'streak') return Math.max(0, data.streak)
  if (mode === 'remaining') return data.remaining > 0 ? Math.floor(data.remaining / 10_000) : 0
  return 0
}

export const badgeSupported = () => typeof navigator !== 'undefined' && 'setAppBadge' in navigator

export async function applyBadge(n: number) {
  if (!badgeSupported()) return
  try {
    if (n > 0) await navigator.setAppBadge(n)
    else await navigator.clearAppBadge()
  } catch {
    // 권한이 없거나 브라우저가 거절 — 조용히 무시
  }
}
