import { db as defaultDb, type LedgerDB } from './schema'

export const BACKUP_APP = 'pocket-ledger'
export const SCHEMA_VERSION = 1

const TABLES = [
  'wallets',
  'categories',
  'transactions',
  'recurring',
  'recurringLog',
  'favorites',
  'noSpendDays',
  'settings',
] as const
type TableName = (typeof TABLES)[number]

export interface Backup {
  app: typeof BACKUP_APP
  schemaVersion: number
  exportedAt: string
  data: Record<TableName, unknown[]>
}

export interface BackupSummary {
  exportedAt: string
  transactions: number
  categories: number
  recurring: number
  favorites: number
}

export async function exportBackup(db: LedgerDB = defaultDb): Promise<Backup> {
  const data = {} as Backup['data']
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) data[t] = await db.table(t).toArray()
  })
  return { app: BACKUP_APP, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }
}

export class BackupError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** 파일 내용을 읽어 형식을 검사한다. 문제가 있으면 한국어 메시지의 BackupError */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('JSON 파일이 아니에요.')
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP || !isObj(raw.data)) {
    throw new BackupError('이 가계부의 백업 파일이 아니에요.')
  }
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('더 새 버전 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 시도해 주세요.')
  }
  const data = raw.data
  for (const t of TABLES) {
    if (data[t] === undefined) data[t] = []
    if (!Array.isArray(data[t])) throw new BackupError(`백업 파일이 손상됐어요. (${t})`)
  }
  const txs = data.transactions as unknown[]
  txs.forEach((t, i) => {
    if (
      !isObj(t) ||
      typeof t.id !== 'string' ||
      typeof t.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(t.date) ||
      typeof t.amount !== 'number' ||
      !Number.isFinite(t.amount) ||
      (t.type !== 'expense' && t.type !== 'income') ||
      (t.walletId !== 'cash' && t.walletId !== 'point') ||
      typeof t.categoryId !== 'string'
    ) {
      throw new BackupError(`기록 ${i + 1}번째 항목의 형식이 올바르지 않아요.`)
    }
  })
  if ((data.wallets as unknown[]).length === 0) {
    throw new BackupError('백업 파일에 지갑 정보가 없어요.')
  }
  return raw as unknown as Backup
}

export const summarize = (b: Backup): BackupSummary => ({
  exportedAt: b.exportedAt,
  transactions: b.data.transactions.length,
  categories: b.data.categories.length,
  recurring: b.data.recurring.length,
  favorites: b.data.favorites.length,
})

/** 모든 데이터를 지우고 백업으로 덮어쓴다. 한 트랜잭션이라 중간에 실패하면 원래대로 남는다 */
export async function restoreBackup(b: Backup, db: LedgerDB = defaultDb) {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkAdd(b.data[t])
    }
  })
}

export const backupFileName = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `가계부-백업-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`
}

/**
 * 파일로 내보내기. iOS 홈 화면 앱에서는 <a download>가 잘 안 되므로
 * 공유 시트(→ "파일에 저장")를 먼저 쓰고, 안 되면 일반 다운로드로.
 * @returns 'shared' | 'downloaded' | 'cancelled'
 */
export async function saveBackupFile(b: Backup): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = backupFileName()
  const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' })
  const file = new File([blob], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return 'shared'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled'
      // 공유가 막히면 아래 다운로드로
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
