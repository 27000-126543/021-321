import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book, UpdateRecord, AppSettings, QuietPeriod, ReadingTimeSlot, QuietPeriodUpdate, EveningSummary, CheckResult } from '@/types'

interface BookStore {
  books: Book[]
  updateRecords: Record<string, UpdateRecord[]>
  settings: AppSettings
  quietUpdates: QuietPeriodUpdate[]
  eveningSummaries: EveningSummary[]
  checkResults: Record<string, CheckResult>
  isChecking: boolean
  isInQuietMode: boolean
  previousQuietModeState: boolean

  addBook: (book: Omit<Book, 'id' | 'status' | 'latestChapter' | 'lastUpdateTime' | 'createdAt' | 'isPaused' | 'lastCheckedAt' | 'checkedWithNewChapter'>) => boolean
  removeBook: (id: string) => void
  updateBook: (id: string, updates: Partial<Book>) => void
  markAsRead: (id: string) => void
  markAsReadLater: (id: string) => void
  pauseTracking: (id: string) => void
  resumeTracking: (id: string) => void
  simulateUpdate: (bookId: string) => boolean

  addUpdateRecord: (record: Omit<UpdateRecord, 'id'>) => void

  updateSettings: (updates: Partial<AppSettings>) => void
  addQuietPeriod: (period: Omit<QuietPeriod, 'id'>) => void
  removeQuietPeriod: (id: string) => void
  updateQuietPeriod: (id: string, updates: Partial<QuietPeriod>) => void
  addReadingTimeSlot: (slot: ReadingTimeSlot) => void
  removeReadingTimeSlot: (index: number) => void

  isQuietTime: () => boolean
  getPendingBooks: () => Book[]
  isInReadingTimeSlot: () => boolean

  checkAllUpdates: (silent?: boolean) => Promise<CheckResult[]>
  checkSingleBook: (bookId: string) => CheckResult | null
  recomputeAllBookStatuses: () => void

  clearCheckedStatus: () => void
  markSummaryAsRead: (summaryId: string) => void
  getUnreadSummaries: () => EveningSummary[]
  getActiveEveningSummary: () => EveningSummary | null

  updateQuietModeState: () => void
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

function computeBookStatus(book: Book, allRecords: UpdateRecord[] = []): Book['status'] {
  if (book.isPaused) return 'normal'
  if (book.currentChapter < book.latestChapter) return 'pending'

  const lastUpdate = new Date(book.lastUpdateTime)
  const now = new Date()
  const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)

  if (book.updateSchedule.type === 'daily' && daysSinceUpdate > 7) return 'discontinued'
  if (book.updateSchedule.type === 'weekly' && daysSinceUpdate > 14) return 'discontinued'
  if (book.updateSchedule.type === 'custom' && daysSinceUpdate > 30) return 'discontinued'

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayUpdates = allRecords.filter(
    (r) => r.bookId === book.id && new Date(r.updatedAt).getTime() >= todayStart.getTime()
  )
  if (todayUpdates.length >= 3) return 'burst'

  return 'normal'
}

const SAMPLE_CHAPTER_TITLES = [
  '风云再起', '暗流涌动', '破茧重生', '宿命对决', '迷雾重重',
  '逆天改命', '绝地反击', '心魔试炼', '天机不可泄', '大道至简',
  '乾坤未定', '生死一线', '万法归宗', '潜龙出渊', '星河倒转',
]

function getCurrentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      books: [],
      updateRecords: {},
      settings: defaultSettings,
      quietUpdates: [],
      eveningSummaries: [],
      checkResults: {},
      isChecking: false,
      isInQuietMode: false,
      previousQuietModeState: false,

      addBook: (bookData) => {
        if (!Number.isInteger(bookData.currentChapter) || bookData.currentChapter < 1) {
          return false
        }

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
        return true
      },

      removeBook: (id) => {
        set((state) => {
          const { [id]: _, ...remainingRecords } = state.updateRecords
          const { [id]: __, ...remainingCheckResults } = state.checkResults
          return {
            books: state.books.filter((b) => b.id !== id),
            updateRecords: remainingRecords,
            checkResults: remainingCheckResults,
            quietUpdates: state.quietUpdates.filter((u) => u.bookId !== id),
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
              ? { ...b, currentChapter: b.latestChapter, status: 'normal' as const, checkedWithNewChapter: false }
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
        set((state) => {
          const book = state.books.find((b) => b.id === id)
          if (!book) return state
          const records = state.updateRecords[id] || []
          const newStatus = computeBookStatus(book, records)
          return {
            books: state.books.map((b) =>
              b.id === id ? { ...b, isPaused: false, status: newStatus } : b
            ),
          }
        })
      },

      simulateUpdate: (bookId) => {
        const book = get().books.find((b) => b.id === bookId)
        if (!book || book.isPaused) return false

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

        const quietUpdate: QuietPeriodUpdate = {
          bookId,
          bookTitle: book.title,
          chapter: newChapter,
          title,
          wordCount,
          receivedAt: now,
        }

        set((state) => {
          const existingRecords = state.updateRecords[bookId] || []
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const todayUpdates = existingRecords.filter(
            (r) => new Date(r.updatedAt).getTime() >= todayStart.getTime()
          )
          const isBurst = todayUpdates.length >= 2
          const newStatus: Book['status'] = isBurst ? 'burst' : (book.currentChapter < newChapter ? 'pending' : 'normal')

          const inQuietTime = get().isQuietTime()
          let newQuietUpdates = state.quietUpdates
          let newSummaries = state.eveningSummaries

          if (inQuietTime && book.currentChapter < newChapter) {
            newQuietUpdates = [...state.quietUpdates, quietUpdate]
          }

          return {
            books: state.books.map((b) =>
              b.id === bookId ? { ...b, latestChapter: newChapter, lastUpdateTime: now, status: newStatus } : b
            ),
            updateRecords: {
              ...state.updateRecords,
              [bookId]: [...existingRecords, record],
            },
            quietUpdates: newQuietUpdates,
            eveningSummaries: newSummaries,
          }
        })

        return true
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
        setTimeout(() => get().updateQuietModeState(), 0)
      },

      addQuietPeriod: (period) => {
        const newPeriod: QuietPeriod = { ...period, id: generateId() }
        set((state) => ({
          settings: {
            ...state.settings,
            quietPeriods: [...state.settings.quietPeriods, newPeriod],
          },
        }))
        setTimeout(() => get().updateQuietModeState(), 0)
      },

      removeQuietPeriod: (id) => {
        set((state) => ({
          settings: {
            ...state.settings,
            quietPeriods: state.settings.quietPeriods.filter((p) => p.id !== id),
          },
        }))
        setTimeout(() => get().updateQuietModeState(), 0)
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
        setTimeout(() => get().updateQuietModeState(), 0)
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
        const currentMinutes = getCurrentMinutes()
        const { quietPeriods } = get().settings

        return quietPeriods.some((period) => {
          if (!period.enabled) return false
          const startMinutes = parseTimeToMinutes(period.start)
          const endMinutes = parseTimeToMinutes(period.end)

          if (startMinutes <= endMinutes) {
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes
          }
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes
        })
      },

      isInReadingTimeSlot: () => {
        const currentMinutes = getCurrentMinutes()
        const { readingTimeSlots } = get().settings

        return readingTimeSlots.some((slot) => {
          const startMinutes = parseTimeToMinutes(slot.start)
          const endMinutes = parseTimeToMinutes(slot.end)

          if (startMinutes <= endMinutes) {
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes
          }
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes
        })
      },

      getPendingBooks: () => {
        return get().books.filter((b) => b.status === 'pending' && !b.isPaused)
      },

      checkAllUpdates: async (silent = false) => {
        if (get().isChecking && !silent) return []
        set({ isChecking: true })

        const results: CheckResult[] = []
        const { books, updateRecords, isQuietTime } = get()
        const activeBooks = books.filter((b) => !b.isPaused)

        for (const book of activeBooks) {
          await new Promise((r) => setTimeout(r, 150))
          const shouldUpdate = Math.random() > 0.55
          const now = new Date().toISOString()

          let hasNewChapter = false
          let newCount = 0

          if (shouldUpdate) {
            const success = get().simulateUpdate(book.id)
            if (success) {
              hasNewChapter = true
              newCount = 1
            }
          }

          const result: CheckResult = {
            bookId: book.id,
            checkedAt: now,
            hasNewChapter,
            newChaptersCount: newCount,
          }
          results.push(result)

          set((state) => ({
            books: state.books.map((b) =>
              b.id === book.id
                ? { ...b, lastCheckedAt: now, checkedWithNewChapter: hasNewChapter }
                : b
            ),
            checkResults: { ...state.checkResults, [book.id]: result },
          }))
        }

        const currentQuietState = get().isQuietTime()
        const wasQuiet = get().previousQuietModeState

        if (wasQuiet && !currentQuietState) {
          const quietUpdates = get().quietUpdates
          if (quietUpdates.length > 0) {
            const today = new Date().toISOString().split('T')[0]
            const existingToday = get().eveningSummaries.find((s) => s.date === today)

            if (!existingToday) {
              const summary: EveningSummary = {
                id: generateId(),
                date: today,
                updates: [...quietUpdates],
                read: false,
              }
              set((state) => ({
                eveningSummaries: [...state.eveningSummaries, summary],
                quietUpdates: [],
              }))
            }
          }
        }

        set({ isChecking: false })
        return results
      },

      checkSingleBook: (bookId) => {
        const book = get().books.find((b) => b.id === bookId)
        if (!book || book.isPaused) return null

        const shouldUpdate = Math.random() > 0.5
        const now = new Date().toISOString()
        let hasNewChapter = false
        let newCount = 0

        if (shouldUpdate) {
          const success = get().simulateUpdate(bookId)
          if (success) {
            hasNewChapter = true
            newCount = 1
          }
        }

        const result: CheckResult = {
          bookId,
          checkedAt: now,
          hasNewChapter,
          newChaptersCount: newCount,
        }

        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId
              ? { ...b, lastCheckedAt: now, checkedWithNewChapter: hasNewChapter }
              : b
          ),
          checkResults: { ...state.checkResults, [bookId]: result },
        }))

        return result
      },

      recomputeAllBookStatuses: () => {
        set((state) => {
          const allRecords = Object.values(state.updateRecords).flat()
          return {
            books: state.books.map((book) => {
              const records = state.updateRecords[book.id] || []
              const newStatus = computeBookStatus(book, records)
              return { ...book, status: newStatus }
            }),
          }
        })
      },

      clearCheckedStatus: () => {
        set((state) => ({
          books: state.books.map((b) => ({ ...b, checkedWithNewChapter: false })),
        }))
      },

      markSummaryAsRead: (summaryId) => {
        set((state) => ({
          eveningSummaries: state.eveningSummaries.map((s) =>
            s.id === summaryId ? { ...s, read: true } : s
          ),
        }))
      },

      getUnreadSummaries: () => {
        return get().eveningSummaries.filter((s) => !s.read)
      },

      getActiveEveningSummary: () => {
        const today = new Date().toISOString().split('T')[0]
        return get().eveningSummaries.find((s) => s.date === today && !s.read) || null
      },

      updateQuietModeState: () => {
        const currentQuiet = get().isQuietTime()
        const previous = get().previousQuietModeState

        if (previous && !currentQuiet) {
          const quietUpdates = get().quietUpdates
          if (quietUpdates.length > 0) {
            const today = new Date().toISOString().split('T')[0]
            const existingToday = get().eveningSummaries.find((s) => s.date === today)

            if (!existingToday) {
              const summary: EveningSummary = {
                id: generateId(),
                date: today,
                updates: [...quietUpdates],
                read: false,
              }
              set((state) => ({
                eveningSummaries: [...state.eveningSummaries, summary],
                quietUpdates: [],
              }))
            }
          }
        }

        set({
          isInQuietMode: currentQuiet,
          previousQuietModeState: currentQuiet,
        })
      },
    }),
    {
      name: 'bookshelf-storage',
    }
  )
)
