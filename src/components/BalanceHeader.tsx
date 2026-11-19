import { formatWon } from '../domain/money'
import type { Ledger } from '../hooks/useData'

const signedWon = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatWon(Math.abs(n))}`

/** 메인 상단: 💳 이번 달 남은 돈 · 🎓 포인트 잔액 · 🔥 스트릭 */
export default function BalanceHeader({ ledger }: { ledger: Ledger | null }) {
  const cash = ledger?.cash
  const negative = cash ? cash.remaining < 0 : false

  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-3 pb-3">
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-muted">💳 이번 달 남은 돈</div>
        <div className={`num text-[28px] leading-tight font-bold ${negative ? 'text-stamp' : ''}`}>
          {cash ? (negative ? '−' : '') + formatWon(Math.abs(cash.remaining)) : '–'}
          <span className="ml-0.5 text-base font-semibold">원</span>
        </div>
        {cash && cash.pending !== 0 && (
          <div className="text-[11px] text-muted">
            예정된 고정 항목 <span className="num">{signedWon(cash.pending)}</span> 포함
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-4 text-right">
        <div>
          <div className="text-[11px] font-medium text-muted">🎓 포인트</div>
          <div className="num text-lg leading-tight font-bold text-point">{ledger ? formatWon(ledger.point) : '–'}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-muted">{ledger?.streak.today ? '🔥' : '🕯️'} 연속</div>
          <div className="num text-lg leading-tight font-bold">
            {ledger ? ledger.streak.current : '–'}
            <span className="text-xs font-semibold">일</span>
          </div>
          {ledger && ledger.streak.best > 0 && (
            <div className="text-[10px] text-muted">최고 {ledger.streak.best}일</div>
          )}
        </div>
      </div>
    </header>
  )
}
