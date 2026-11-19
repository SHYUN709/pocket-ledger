import type { ReactNode } from 'react'

/** 아래에서 올라오는 시트. 바깥을 탭하면 닫힌다 */
export default function Sheet({
  open,
  onClose,
  title,
  action,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  /** 제목 오른쪽 버튼 — 키보드가 올라와도 가려지지 않게 위에 둔다 */
  action?: ReactNode
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet max-h-[85dvh] w-full max-w-md overflow-x-hidden overflow-y-auto rounded-t-3xl bg-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        {(title || action) && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{title}</h2>
            {action}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
