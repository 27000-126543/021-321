export interface Book {
  id: string
  title: string
  author: string
  platform: string
  currentChapter: number
  latestChapter: number
  updateSchedule: UpdateSchedule
  status: 'normal' | 'discontinued' | 'burst' | 'pending'
  lastUpdateTime: string
  createdAt: string
  isPaused: boolean
  lastCheckedAt?: string
  checkedWithNewChapter?: boolean
}

export interface CheckResult {
  bookId: string
  checkedAt: string
  hasNewChapter: boolean
  newChaptersCount: number
}

export interface QuietPeriodUpdate {
  bookId: string
  bookTitle: string
  chapter: number
  title: string
  wordCount: number
  receivedAt: string
}

export interface EveningSummary {
  id: string
  date: string
  updates: QuietPeriodUpdate[]
  read: boolean
}

export interface UpdateSchedule {
  type: 'daily' | 'weekly' | 'custom'
  time: string
  days?: number[]
  customNote?: string
}

export interface UpdateRecord {
  id: string
  bookId: string
  chapter: number
  title: string
  wordCount: number
  updatedAt: string
}

export interface QuietPeriod {
  id: string
  name: string
  start: string
  end: string
  enabled: boolean
}

export interface ReadingTimeSlot {
  start: string
  end: string
}

export interface AppSettings {
  quietPeriods: QuietPeriod[]
  readingTimeSlots: ReadingTimeSlot[]
  notificationsEnabled: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export type SortOption = 'updateTime' | 'title' | 'status'

export const PLATFORMS = [
  '起点中文网',
  '番茄小说',
  '晋江文学城',
  '纵横中文网',
  '17K小说网',
  '飞卢小说',
  '书旗小说',
  '其他',
] as const

export const STATUS_CONFIG = {
  normal: { label: '正常', color: '#5CB85C', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  discontinued: { label: '断更', color: '#E85D4A', bg: 'bg-red-50 text-red-700 border-red-200' },
  burst: { label: '爆更', color: '#F0B429', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { label: '待补读', color: '#4A90D9', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
} as const

export const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const
