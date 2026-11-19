import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastOptions {
  message: string
  /** 둘째 줄 (예: 포인트 안내) */
  detail?: string
  action?: { label: string; onClick: () => void }
  /** 메시지 아래에 붙는 추가 UI (예: 만족·후회 버튼). dismiss로 닫는다 */
  extra?: (dismiss: () => void) => ReactNode
  duration?: number
}

type ShowToast = (opts: ToastOptions) => void

const ToastContext = createContext<ShowToast>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback<ShowToast>((opts) => {
    window.clearTimeout(timer.current)
    setToast({ ...opts, key: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), opts.duration ?? 3000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        // 키패드(52px×4)+탭바(48px) 바로 위 — 다음 입력을 가리지 않는다
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+272px)] z-50 flex justify-center px-4">
          <div
            key={toast.key}
            role="status"
            className="animate-toast pointer-events-auto w-full max-w-sm rounded-2xl bg-ink px-4 py-3 text-sm text-paper shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="flex flex-1 flex-col">
                <span>{toast.message}</span>
                {toast.detail && <span className="mt-0.5 font-semibold text-on-ink-point">{toast.detail}</span>}
              </span>
              {toast.action && (
                <button
                  className="shrink-0 font-semibold text-on-ink-stamp"
                  onClick={() => {
                    toast.action!.onClick()
                    dismiss()
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            {toast.extra?.(dismiss)}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
