import { useRef } from 'react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back']

/** 시스템 키보드 대신 쓰는 숫자 키패드. ⌫를 길게 누르면 전체 지움 */
export default function Keypad({ onKey }: { onKey: (key: string) => void }) {
  const holdTimer = useRef<number | undefined>(undefined)
  const held = useRef(false)

  const startHold = () => {
    held.current = false
    holdTimer.current = window.setTimeout(() => {
      held.current = true
      onKey('clear')
    }, 450)
  }
  const endHold = () => window.clearTimeout(holdTimer.current)

  return (
    <div className="grid select-none grid-cols-3 gap-px border-t border-line bg-line">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          aria-label={k === 'back' ? '지우기' : k}
          className="num flex h-[52px] items-center justify-center bg-paper text-[26px] font-medium active:bg-card"
          onPointerDown={k === 'back' ? startHold : undefined}
          onPointerUp={k === 'back' ? endHold : undefined}
          onPointerLeave={k === 'back' ? endHold : undefined}
          onClick={() => {
            if (k === 'back' && held.current) return
            onKey(k)
          }}
        >
          {k === 'back' ? '⌫' : k}
        </button>
      ))}
    </div>
  )
}
