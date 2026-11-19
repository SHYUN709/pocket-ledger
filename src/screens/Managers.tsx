import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import Segment from '../components/Segment'
import Sheet from '../components/Sheet'
import { useToast } from '../components/Toast'
import { archiveCategory, deleteFavorite, deleteRecurring, saveCategory, saveRecurring } from '../db/repo'
import { db, type Category, type Recurring, type TxType, type WalletId } from '../db/schema'
import { formatWon } from '../domain/money'
import { isPointBlocked } from '../domain/points'
import { useCategories, useCategoryMap, useFavorites, useRecurring } from '../hooks/useData'

const inputCls =
  'w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none placeholder:text-muted/70 focus:border-ink'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  )
}

function ListRow({ left, title, sub, right, onClick }: { left: string; title: string; sub?: string; right?: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-line px-1 py-3 text-left last:border-b-0 active:bg-paper"
    >
      <span className="w-7 text-center text-xl">{left}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
      </span>
      {right}
    </button>
  )
}

const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="h-9 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-paper active:scale-95"
  >
    {label}
  </button>
)

// ───────────────────────── 고정 항목 ─────────────────────────

type RecurringDraft = Omit<Recurring, 'id'> & { id?: string }

export function RecurringManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useRecurring()
  const cats = useCategoryMap()
  const [draft, setDraft] = useState<RecurringDraft | null>(null)

  const sorted = [...list].sort((a, b) => a.dayOfMonth - b.dayOfMonth)

  return (
    <>
      <Sheet
        open={open && !draft}
        onClose={onClose}
        title="고정 항목"
        action={
          <AddButton
            label="＋ 추가"
            onClick={() =>
              setDraft({ name: '', amount: 0, type: 'expense', walletId: 'cash', categoryId: '', dayOfMonth: 1 })
            }
          />
        }
      >
        <p className="mb-2 text-[13px] text-muted">
          날짜가 되면 메인에 확인 카드가 떠요. 자동으로 기록되지는 않아요.
        </p>
        {sorted.length === 0 && <p className="py-8 text-center text-sm text-muted">아직 없어요. 월급, 통신비, 구독 등을 추가해 보세요.</p>}
        {sorted.map((r) => (
          <ListRow
            key={r.id}
            left={cats.get(r.categoryId)?.emoji ?? '📌'}
            title={r.name}
            sub={`매달 ${r.dayOfMonth}일 · ${r.walletId === 'cash' ? '💳' : '🎓'} ${r.type === 'expense' ? '지출' : '수입'}`}
            right={
              <span className={`num font-semibold ${r.type === 'income' ? 'text-income' : ''}`}>
                {r.type === 'income' ? '+' : ''}
                {formatWon(r.amount)}
              </span>
            }
            onClick={() => setDraft(r)}
          />
        ))}
      </Sheet>
      {draft && <RecurringEditor draft={draft} onClose={() => setDraft(null)} />}
    </>
  )
}

function RecurringEditor({ draft, onClose }: { draft: RecurringDraft; onClose: () => void }) {
  const [d, setD] = useState(draft)
  const categories = useCategories(d.type).filter((c) => !isPointBlocked(d.walletId, c))
  const set = (p: Partial<RecurringDraft>) => setD((x) => ({ ...x, ...p }))
  const valid = d.name.trim() && d.amount > 0 && categories.some((c) => c.id === d.categoryId)

  const save = async () => {
    if (!valid) return
    await saveRecurring({ ...d, name: d.name.trim() })
    onClose()
  }
  const remove = async () => {
    if (d.id && window.confirm(`"${d.name}" 고정 항목을 지울까요? 이미 기록된 내역은 남아요.`)) {
      await deleteRecurring(d.id)
      onClose()
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={d.id ? '고정 항목 수정' : '고정 항목 추가'}
      action={<AddButton label="저장" onClick={save} />}
    >
      <div className="mb-3 flex gap-2">
        <Segment
          full
          value={d.type}
          onChange={(type: TxType) => set({ type, categoryId: '' })}
          options={[
            { value: 'expense', label: '지출' },
            { value: 'income', label: '수입' },
          ]}
        />
        <Segment
          full
          value={d.walletId}
          onChange={(walletId: WalletId) => set({ walletId })}
          options={[
            { value: 'cash', label: '💳 내 돈' },
            { value: 'point', label: '🎓 포인트' },
          ]}
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="이름">
            <input className={inputCls} placeholder="예: 통신비" value={d.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
        </div>
        <div className="w-24">
          <Field label="매달">
            <select className={inputCls} value={d.dayOfMonth} onChange={(e) => set({ dayOfMonth: Number(e.target.value) })}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 31 ? '말일' : `${n}일`}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <Field label="금액 (원)">
        <input
          className={`${inputCls} num text-right`}
          inputMode="numeric"
          placeholder="0"
          value={d.amount ? formatWon(d.amount) : ''}
          onChange={(e) => set({ amount: Number(e.target.value.replace(/\D/g, '').slice(0, 10)) })}
        />
      </Field>
      <span className="mb-1 block text-xs font-semibold text-muted">카테고리</span>
      <CategoryChips categories={categories} value={d.categoryId} onChange={(categoryId) => set({ categoryId })} />
      {d.id && (
        <button type="button" onClick={remove} className="mt-6 w-full py-2 text-sm font-semibold text-stamp">
          이 고정 항목 지우기
        </button>
      )}
    </Sheet>
  )
}

export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`rounded-full border px-3 py-1.5 text-sm ${value === c.id ? 'border-ink bg-ink text-paper' : 'border-line'}`}
        >
          {c.emoji} {c.name}
        </button>
      ))}
    </div>
  )
}

// ───────────────────────── 카테고리 ─────────────────────────

type CategoryDraft = Pick<Category, 'name' | 'emoji' | 'type' | 'pointAllowed'> & { id?: string }

export function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<TxType>('expense')
  const list = useCategories(type)
  const [draft, setDraft] = useState<CategoryDraft | null>(null)

  return (
    <>
      <Sheet
        open={open && !draft}
        onClose={onClose}
        title="카테고리"
        action={<AddButton label="＋ 추가" onClick={() => setDraft({ name: '', emoji: '', type, pointAllowed: true })} />}
      >
        <div className="mb-2">
          <Segment
            full
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: '지출' },
              { value: 'income', label: '수입' },
            ]}
          />
        </div>
        {list.map((c) => (
          <ListRow
            key={c.id}
            left={c.emoji}
            title={c.name}
            right={
              type === 'expense' && (
                <span className={`text-xs font-semibold ${c.pointAllowed ? 'text-point' : 'text-stamp'}`}>
                  {c.pointAllowed ? '🎓 가능' : '🎓 불가'}
                </span>
              )
            }
            onClick={() => setDraft(c)}
          />
        ))}
      </Sheet>
      {draft && <CategoryEditor draft={draft} onClose={() => setDraft(null)} />}
    </>
  )
}

function CategoryEditor({ draft, onClose }: { draft: CategoryDraft; onClose: () => void }) {
  const toast = useToast()
  const [d, setD] = useState(draft)
  const usage = useLiveQuery(async () => (d.id ? db.transactions.where('categoryId').equals(d.id).count() : 0), [d.id])
  const valid = d.name.trim() && d.emoji.trim()

  const save = async () => {
    if (!valid) return
    await saveCategory({ ...d, name: d.name.trim(), emoji: [...d.emoji.trim()].slice(0, 2).join('') })
    onClose()
  }
  const remove = async () => {
    if (!d.id) return
    const msg = usage
      ? `"${d.name}"을(를) 지울까요? 기록 ${usage}개는 그대로 남고, 새로 기록할 때만 안 보여요.`
      : `"${d.name}"을(를) 지울까요?`
    if (!window.confirm(msg)) return
    await archiveCategory(d.id)
    toast({ message: `${d.name} 카테고리를 지웠어요` })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={d.id ? '카테고리 수정' : `${d.type === 'expense' ? '지출' : '수입'} 카테고리 추가`}
      action={<AddButton label="저장" onClick={save} />}
    >
      <div className="flex gap-2">
        <div className="w-20">
          <Field label="이모지">
            <input className={`${inputCls} text-center text-xl`} placeholder="🍜" value={d.emoji} onChange={(e) => setD({ ...d, emoji: e.target.value })} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="이름">
            <input className={inputCls} placeholder="예: 편의점" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
        </div>
      </div>
      {d.type === 'expense' && (
        <label className="flex items-center justify-between rounded-xl border border-line bg-paper px-3 py-3">
          <span>
            <span className="block font-medium">🎓 장학 포인트로 결제 가능</span>
            <span className="block text-xs text-muted">끄면 🎓 지갑으로 기록할 수 없어요</span>
          </span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-[var(--point)]"
            checked={d.pointAllowed}
            onChange={(e) => setD({ ...d, pointAllowed: e.target.checked })}
          />
        </label>
      )}
      {d.id && (
        <button type="button" onClick={remove} className="mt-6 w-full py-2 text-sm font-semibold text-stamp">
          이 카테고리 지우기
        </button>
      )}
    </Sheet>
  )
}

// ───────────────────────── 즐겨찾기 ─────────────────────────

export function FavoriteManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const favorites = useFavorites()
  const cats = useCategoryMap()
  return (
    <Sheet open={open} onClose={onClose} title="즐겨찾기">
      <p className="mb-2 text-[13px] text-muted">입력 화면의 ＋ 즐겨찾기로 추가해요. 칩을 길게 눌러도 지울 수 있어요.</p>
      {favorites.length === 0 && <p className="py-8 text-center text-sm text-muted">아직 없어요.</p>}
      {favorites.map((f) => (
        <ListRow
          key={f.id}
          left={cats.get(f.categoryId)?.emoji ?? '⭐'}
          title={f.label}
          sub={`${f.walletId === 'cash' ? '💳' : '🎓'} ${cats.get(f.categoryId)?.name ?? ''} · ${formatWon(f.amount)}원`}
          right={
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm(`"${f.label}"을(를) 지울까요?`)) deleteFavorite(f.id)
              }}
              className="rounded-full px-3 py-1 text-sm font-semibold text-stamp"
            >
              지우기
            </span>
          }
        />
      ))}
    </Sheet>
  )
}
