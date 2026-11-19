import type { Category, TxType, Wallet } from './schema'

export const DEFAULT_WALLETS: Wallet[] = [
  { id: 'cash', name: '내 돈', emoji: '💳' },
  { id: 'point', name: '장학 포인트', emoji: '🎓' },
]

type Def = [id: string, name: string, emoji: string, pointAllowed?: boolean]

const EXPENSE: Def[] = [
  ['exp-food', '식비', '🍚'],
  ['exp-cafe', '카페', '☕'],
  ['exp-delivery', '배달', '🛵'],
  ['exp-transit', '교통', '🚌'],
  ['exp-shopping', '쇼핑', '🛍️'],
  ['exp-living', '생활', '🧻'],
  ['exp-subscription', '구독', '📺'],
  ['exp-phone', '통신', '📱'],
  ['exp-drinks', '술자리', '🍻', false],
  ['exp-fun', '오락', '🎮', false],
  ['exp-etc', '기타', '📦'],
]

const INCOME: Def[] = [
  ['inc-salary', '월급·근로', '💼'],
  ['inc-point', '장학 포인트', '🎓'],
  ['inc-allowance', '용돈', '💌'],
  ['inc-resale', '중고 판매', '🏷️'],
  ['inc-etc', '기타', '📦'],
]

const build = (defs: Def[], type: TxType): Category[] =>
  defs.map(([id, name, emoji, pointAllowed = true], order) => ({
    id,
    name,
    emoji,
    type,
    pointAllowed,
    order,
    archived: false,
  }))

export const DEFAULT_CATEGORIES: Category[] = [...build(EXPENSE, 'expense'), ...build(INCOME, 'income')]
