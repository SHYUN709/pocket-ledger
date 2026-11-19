import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from './seed'

export type TxType = 'expense' | 'income'
export type WalletId = 'cash' | 'point'
export type Feeling = 'good' | 'bad' | 'pending' | 'meh' | null

export interface Wallet {
  id: WalletId
  name: string
  emoji: string
}

export interface Category {
  id: string
  name: string
  emoji: string
  type: TxType
  pointAllowed: boolean
  order: number
  /** 삭제하면 지우지 않고 숨긴다 — 옛 기록이 카테고리를 잃지 않도록 */
  archived: boolean
}

export interface Transaction {
  id: string
  /** 현지 날짜 YYYY-MM-DD */
  date: string
  /** 원 단위 정수, 항상 양수 */
  amount: number
  type: TxType
  walletId: WalletId
  categoryId: string
  memo?: string
  feeling: Feeling
  createdAt: number
  /** 고정 항목 확인 카드에서 기록했으면 그 고정 항목 id */
  recurringId?: string
}

export interface Recurring {
  id: string
  name: string
  amount: number
  type: TxType
  walletId: WalletId
  categoryId: string
  /** 1~31. 그달에 없는 날이면 말일로 본다 */
  dayOfMonth: number
}

export interface RecurringLog {
  recurringId: string
  /** YYYY-MM */
  month: string
  status: 'recorded' | 'skipped'
  transactionId?: string
}

export interface Favorite {
  id: string
  label: string
  amount: number
  type: TxType
  walletId: WalletId
  categoryId: string
  order: number
}

export interface NoSpendDay {
  date: string
}

export interface Setting {
  key: string
  value: unknown
}

export class LedgerDB extends Dexie {
  wallets!: EntityTable<Wallet, 'id'>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  recurring!: EntityTable<Recurring, 'id'>
  recurringLog!: Dexie.Table<RecurringLog, [string, string]>
  favorites!: EntityTable<Favorite, 'id'>
  noSpendDays!: EntityTable<NoSpendDay, 'date'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name = 'pocket-ledger') {
    super(name)
    this.version(1).stores({
      wallets: 'id',
      categories: 'id, type, order',
      transactions: 'id, date, createdAt, feeling, categoryId, recurringId',
      recurring: 'id',
      recurringLog: '[recurringId+month], month',
      favorites: 'id, order',
      noSpendDays: 'date',
      settings: 'key',
    })
    // 처음 DB가 만들어질 때 한 번만 실행된다
    this.on('populate', async (tx) => {
      await tx.table('wallets').bulkAdd(DEFAULT_WALLETS)
      await tx.table('categories').bulkAdd(DEFAULT_CATEGORIES)
    })
  }
}

export const db = new LedgerDB()
