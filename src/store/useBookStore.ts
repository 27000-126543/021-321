import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book, UpdateRecord, AppSettings, QuietPeriod, ReadingTimeSlot } from '@/types'

interface BookStore {
  books: Book[]
  updateRecords: Record<string, UpdateRecord[]>
  settings: AppSettings

  addBook: (book: Omit<Book, 'id' | 'status' | 'latestChapter' | 'lastUpdateTime' | 'createdAt' | 'isPaused'>) => void
  removeBook: (id: string) => void
  updateBook: (id: string, updates: Partial<Book>) => void
  markAsRead: (id: string) => void
  markAsReadLater: (id: string) => void
  pauseTracking: (id: string) => void
  resumeTracking: (id: string) => void
  simulateUpdate: (bookId: string) => void

  addUpdateRecord: (record: Omit<UpdateRecord, 'id'>) => void

  updateSettings: (updates: Partial<AppSettings>) => void
  addQuietPeriod: (period: Omit<QuietPeriod, 'id'>) => void
  removeQuietPeriod: (id: string) => void
  updateQuietPeriod: (id: string, updates: Partial<QuietPeriod>) => void
  addReadingTimeSlot: (slot: ReadingTimeSlot) => void
  removeReadingTimeSlot: (index: number) => void

  isQuietTime: () => boolean
  getPendingBooks: () => Book[]
}

const defaultSettings: AppSettings = {
  quietPeriods: [
    { id: 'default-sleep', name: '睡眠时间', start: '23:00', end: '07:00', enabled: true },
  ],
  readingTimeSlots: [
    { start: '08:00', end: '09:00' },
    { start: '21:00', end: '23:00' },
  ],
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: false,
}

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36)

function computeBookStatus(book: Book): Book['status'] {
  if (book.isPaused) return 'normal'
  if (book.currentChapter < book.latestChapter) return 'pending'

  const lastUpdate = new Date(book.lastUpdateTime)
  const now = new Date()
  const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)

  if (book.updateSchedule.type === 'daily' && daysSinceUpdate > 7) return 'discontinued'
  if (book.updateSchedule.type === 'weekly' && daysSinceUpdate > 14) return 'discontinued'
  if (book.updateSchedule.type === 'custom' && daysSinceUpdate > 30) return 'discontinued'

  return 'normal'
}

const SAMPLE_CHAPTER_TITLES = [
  '风云再起', '暗流涌动', '破茧重生', '宿命对决', '迷雾重重',
  '逆天改命', '绝地反击', '心魔试炼', '天机不可泄', '大道至简',
  '乾坤未定', '生死一线', '万法归宗', '潜龙出渊', '星河倒转',
]

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      books: [],
      updateRecords: {},
      settings: defaultSettings,

      addBook: (bookData) => {
        const now = new Date().toISOString()
        const newBook: Book = {
          ...bookData,
          id: generateId(),
          latestChapter: bookData.currentChapter,
          status: 'normal',
          lastUpdateTime: now,
          createdAt: now,
          isPaused: false,
        }
        set((state) => ({ books: [...state.books, newBook] }))
      },

      removeBook: (id) => {
        set((state) => {
          const { [id]: _, ...remainingRecords } = state.updateRecords
          return {
            books: state.books.filter((b) => b.id !== id),
            updateRecords: remainingRecords,
          }
        })
      },

      updateBook: (id, updates) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        }))
      },

      markAsRead: (id) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === id
              ? { ...b, currentChapter: b.latestChapter, status: 'normal' as const }
              : b
          ),
        }))
      },

      markAsReadLater: (id) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === id ? { ...b, status: 'pending' as const } : b
          ),
        }))
      },

      pauseTracking: (id) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === id ? { ...b, isPaused: true, status: 'normal' as const } : b
          ),
        }))
      },

      resumeTracking: (id) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === id ? { ...b, isPaused: false } : b
          ),
        }))
      },

      simulateUpdate: (bookId) => {
        const book = get().books.find((b) => b.id === bookId)
        if (!book || book.isPaused) return

        const newChapter = book.latestChapter + 1
        const title = SAMPLE_CHAPTER_TITLES[Math.floor(Math.random() * SAMPLE_CHAPTER_TITLES.length)]
        const wordCount = 2000 + Math.floor(Math.random() * 5000)
        const now = new Date().toISOString()

        const record: UpdateRecord = {
          id: generateId(),
          bookId,
          chapter: newChapter,
          title,
          wordCount,
          updatedAt: now,
        }

        set((state) => {
          const existingRecords = state.updateRecords[bookId] || []
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const todayUpdates = existingRecords.filter(
            (r) => new Date(r.updatedAt).getTime() >= todayStart.getTime()
          )
          const isBurst = todayUpdates.length >= 2
          const newStatus: Book['status'] = isBurst ? 'burst' : computeBookStatus({ ...book, latestChapter: newChapter, lastUpdateTime: now })

          const updatedBooks = state.books.map((b) =>
            b.id === bookId ? { ...b, latestChapter: newChapter, lastUpdateTime: now, status: newStatus } : b
          )
          return {
            books: updatedBooks,
            updateRecords: {
              ...state.updateRecords,
              [bookId]: [...existingRecords, record],
            },
          }
        })
      },

      addUpdateRecord: (recordData) => {
        const record: UpdateRecord = { ...recordData, id: generateId() }
        set((state) => {
          const existing = state.updateRecords[recordData.bookId] || []
          return {
            updateRecords: {
              ...state.updateRecords,
              [recordData.bookId]: [...existing, record],
            },
          }
        })
      },

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }))
      },

      addQuietPeriod: (period) => {
        const newPeriod: QuietPeriod = { ...period, id: generateId() }
        set((state) => ({
          settings: {
            ...state.settings,
            quietPeriods: [...state.settings.quietPeriods, newPeriod],
          },
        }))
      },

      removeQuietPeriod: (id) => {
        set((state) => ({
          settings: {
            ...state.settings,
            quietPeriods: state.settings.quietPeriods.filter((p) => p.id !== id),
          },
        }))
      },

      updateQuietPeriod: (id, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            quietPeriods: state.settings.quietPeriods.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          },
        }))
      },

      addReadingTimeSlot: (slot) => {
        set((state) => ({
          settings: {
            ...state.settings,
            readingTimeSlots: [...state.settings.readingTimeSlots, slot],
          },
        }))
      },

      removeReadingTimeSlot: (index) => {
        set((state) => ({
          settings: {
            ...state.settings,
            readingTimeSlots: state.settings.readingTimeSlots.filter((_, i) => i !== index),
          },
        }))
      },

      isQuietTime: () => {
        const now = new Date()
        const currentMinutes = now.getHours() * 60 + now.getMinutes()
        const { quietPeriods } = get().settings

        return quietPeriods.some((period) => {
          if (!period.enabled) return false
          const [startH, startM] = period.start.split(':').map(Number)
          const [endH, endM] = period.end.split(':').map(Number)
          const startMinutes = startH * 60 + startM
          const endMinutes = endH * 60 + endM

          if (startMinutes <= endMinutes) {
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes
          }
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes
        })
      },

      getPendingBooks: () => {
        return get().books.filter((b) => b.status === 'pending' && !b.isPaused)
      },
    }),
    {
      name: 'bookshelf-storage',
    }
  )
)
