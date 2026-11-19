import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db/schema'
import { applyBadge, BADGE_SETTING, badgeValue, type BadgeMode } from '../domain/badge'
import { useLedger } from '../hooks/useData'

/**
 * 앱 아이콘 숫자 배지를 최신으로 유지한다. 화면에는 아무것도 그리지 않는다.
 * 웹앱은 백그라운드에서 돌 수 없어서, 앱을 열거나 기록할 때만 숫자가 바뀐다.
 */
export default function BadgeSync() {
  const ledger = useLedger()
  const mode = useLiveQuery(async () => ((await db.settings.get(BADGE_SETTING))?.value as BadgeMode) ?? 'off')

  const value =
    ledger && mode ? badgeValue(mode, { streak: ledger.streak.current, remaining: ledger.cash.remaining }) : null

  useEffect(() => {
    if (value !== null) applyBadge(value)
  }, [value])

  return null
}
