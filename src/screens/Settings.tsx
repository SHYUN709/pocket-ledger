import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import Sheet from '../components/Sheet'
import { useToast } from '../components/Toast'
import {
  BackupError,
  exportBackup,
  parseBackup,
  restoreBackup,
  saveBackupFile,
  summarize,
  type Backup,
} from '../db/backup'
import { setSetting } from '../db/repo'
import { db } from '../db/schema'
import { formatWon } from '../domain/money'
import { CategoryManager, FavoriteManager, RecurringManager } from './Managers'

const LAST_BACKUP = 'lastBackupAt'

export default function Settings() {
  return (
    <div className="no-scrollbar flex-1 overflow-y-auto px-5 pt-4 pb-8">
      <h1 className="mb-5 text-2xl font-bold">설정</h1>
      <ManageSection />
      <BackupSection />
      <p className="mt-8 text-center text-xs text-muted">주머니 가계부 · 모든 데이터는 이 기기에만 저장돼요</p>
    </div>
  )
}

function ManageSection() {
  const [open, setOpen] = useState<'recurring' | 'categories' | 'favorites' | null>(null)
  const recurringCount = useLiveQuery(() => db.recurring.count()) ?? 0
  const favoriteCount = useLiveQuery(() => db.favorites.count()) ?? 0
  const close = () => setOpen(null)
  return (
    <>
      <Section title="관리">
        <Row icon="📌" label="고정 항목" sub={recurringCount ? `${recurringCount}개 · 월급, 통신비, 구독…` : '월급, 장학 포인트, 통신비, 구독…'} onClick={() => setOpen('recurring')} />
        <Row icon="🗂️" label="카테고리" sub="추가·수정·삭제, 포인트 사용 가능 여부" onClick={() => setOpen('categories')} />
        <Row icon="⭐" label="즐겨찾기" sub={`${favoriteCount}개`} onClick={() => setOpen('favorites')} />
      </Section>
      <RecurringManager open={open === 'recurring'} onClose={close} />
      <CategoryManager open={open === 'categories'} onClose={close} />
      <FavoriteManager open={open === 'favorites'} onClose={close} />
    </>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-1 text-sm font-semibold text-muted">{title}</h2>
      {hint && <p className="mb-3 text-[13px] leading-relaxed text-muted">{hint}</p>}
      <div className="overflow-hidden rounded-2xl border border-line bg-card">{children}</div>
    </section>
  )
}

function Row({ icon, label, sub, onClick }: { icon: string; label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-b-0 active:bg-paper"
    >
      <span className="text-xl">{icon}</span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
      <span className="text-muted">›</span>
    </button>
  )
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function BackupSection() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [busy, setBusy] = useState(false)

  const lastBackup = useLiveQuery(async () => (await db.settings.get(LAST_BACKUP))?.value as string | undefined)
  const currentCount = useLiveQuery(() => db.transactions.count()) ?? 0

  const doExport = async () => {
    setBusy(true)
    try {
      const result = await saveBackupFile(await exportBackup())
      if (result === 'cancelled') return
      await setSetting(LAST_BACKUP, new Date().toISOString())
      toast({ message: result === 'shared' ? '백업 파일을 만들었어요' : '백업 파일을 내려받았어요' })
    } catch {
      toast({ message: '백업 파일을 만들지 못했어요' })
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
    } catch (e) {
      toast({ message: e instanceof BackupError ? e.message : '파일을 읽지 못했어요.', duration: 4000 })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const doRestore = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(pending)
      // 백업 파일 안의 설정이 덮어써도 "마지막 백업" 시각은 이 폰 기준으로 유지
      if (lastBackup) await setSetting(LAST_BACKUP, lastBackup)
      toast({ message: `백업을 불러왔어요 · 기록 ${formatWon(pending.data.transactions.length)}개` })
      setPending(null)
    } catch {
      toast({ message: '불러오기에 실패했어요. 기존 데이터는 그대로예요.', duration: 4000 })
    } finally {
      setBusy(false)
    }
  }

  const s = pending && summarize(pending)

  return (
    <>
      <Section
        title="백업"
        hint="데이터는 이 폰 안에만 있어요. 앱을 지우거나 사파리 데이터를 지우면 사라지니, 가끔 백업해서 파일 앱(iCloud Drive)에 보관해 두세요."
      >
        <Row
          icon="📤"
          label="백업 파일 만들기"
          sub={lastBackup ? `마지막 백업: ${timeAgo(lastBackup)}` : '아직 백업한 적 없어요'}
          onClick={doExport}
        />
        <Row icon="📥" label="백업 파일 불러오기" sub="지금 데이터를 덮어써요" onClick={() => fileRef.current?.click()} />
      </Section>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <Sheet open={!!pending} onClose={() => !busy && setPending(null)} title="백업 불러오기">
        {s && (
          <>
            <p className="text-sm text-muted">{fmtDateTime(s.exportedAt)}에 만든 백업</p>
            <ul className="my-4 grid grid-cols-2 gap-2 text-sm">
              <Stat label="기록" value={s.transactions} />
              <Stat label="카테고리" value={s.categories} />
              <Stat label="고정 항목" value={s.recurring} />
              <Stat label="즐겨찾기" value={s.favorites} />
            </ul>
            <p className="rounded-xl bg-stamp/10 px-3 py-2.5 text-sm leading-relaxed text-stamp">
              지금 있는 기록 {formatWon(currentCount)}개를 포함한 모든 데이터가 지워지고 이 백업으로 바뀌어요. 되돌릴 수
              없어요.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPending(null)}
                className="h-12 flex-1 rounded-2xl border border-line font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={doRestore}
                className="h-12 flex-1 rounded-2xl bg-stamp font-semibold text-white disabled:opacity-50"
              >
                {busy ? '불러오는 중…' : '덮어쓰기'}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-baseline justify-between rounded-xl bg-paper px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="num font-semibold">{formatWon(value)}개</span>
    </li>
  )
}
