export type Tab = 'entry' | 'history' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'entry', label: '입력', icon: '✎' },
  { id: 'history', label: '기록', icon: '☰' },
  { id: 'settings', label: '설정', icon: '⚙' },
]

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="flex border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            tab === t.id ? 'text-ink' : 'text-muted'
          }`}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <span className="text-base leading-none">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
