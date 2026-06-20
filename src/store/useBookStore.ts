import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Book, UpdateRecord, AppSettings, QuietPeriod, ReadingTimeSlot,
  QuietPeriodUpdate, EveningSummary, CheckResult, NotificationItem,
  UpdateRecordStatus, NotificationStatus,
} from '@/types'
import { getScheduleLabel } from '@/lib/utils'

interface BookStore {
  books: Book[]
  updateRecords: Record<string, UpdateRecord[]>
  settings: AppSettings
  quietUpdates: QuietPeriodUpdate[]
  eveningSummaries: EveningSummary[]
  checkResults: Record<string, CheckResult>
  notifications: NotificationItem[]
  isChecking: boolean
  isInQuietMode: boolean
  previousQuietModeState: boolean

  addBook: (book: Omit<Book, 'id' | 'status' | 'latestChapter' | 'lastUpdateTime' | 'createdAt' | 'isPaused' | 'lastCheckedAt' | 'checkedWithNewChapter' | 'updateExpectation'> & { updateExpectation?: string }) => boolean
  removeBook: (id: string) => void
  updateBook: (id: string, updates: Partial<Book>) => void
  markAsRead: (id: string) => void
  markAsReadLater: (id: string) => void
  pauseTracking: (id: string) => void
  resumeTracking: (id: string) => void
  simulateUpdate: (bookId: string, silent?: boolean) => boolean
  updateBookExpectation: (bookId: string, expectation: string) => void

  addUpdateRecord: (record: Omit<UpdateRecord, 'id' | 'status'> & { status?: UpdateRecordStatus }) => void
  setUpdateRecordStatus: (recordId: string, bookId: string, status: UpdateRecordStatus) => void
  getUnreadCountForBook: (bookId: string) => number
  getTotalUnreadCount: () => number

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

  addNotification: (item: Omit<NotificationItem, 'id' | 'status' | 'createdAt'> & Partial<Pick<NotificationItem, 'status' | 'createdAt'>>) => void
  setNotificationStatus: (id: string, status: NotificationStatus) => void
  markAllNotificationsAs: (status: NotificationStatus) => void
  getUnreadNotificationCount: () => number
  getTodayNotifications: () => NotificationItem[]

  getBookCheckHistory: (bookId: string) => CheckResult[]
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

function getDaysSinceUpdate(lastUpdateTime: string): number {
  const lastUpdate = new Date(lastUpdateTime)
  const now = new Date()
  return (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
}

function isOverdue(scheduleType: string, daysSince: number): boolean {
  if (scheduleType === 'daily') return daysSince > 7
  if (scheduleType === 'weekly') return daysSince > 14
  return daysSince > 30
}

function computeBookStatus(book: Book, allRecords: UpdateRecord[] = []): Book['status'] {
  if (book.isPaused) return 'normal'

  const daysSinceUpdate = getDaysSinceUpdate(book.lastUpdateTime)
  const overdue = isOverdue(book.updateSchedule.type, daysSinceUpdate)

  if (overdue) {
    return 'discontinued'
  }

  const unreadRecords = allRecords.filter(
    (r) => r.bookId === book.id && r.status === 'unread'
  )
  if (unreadRecords.length > 0) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayUpdates = allRecords.filter(
      (r) => r.bookId === book.id && new Date(r.updatedAt).getTime() >= todayStart.getTime()
    )
    if (todayUpdates.length >= 3) return 'burst'
    return 'pending'
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayUpdates = allRecords.filter(
    (r) => r.bookId === book.id && new Date(r.updatedAt).getTime() >= todayStart.getTime()
  )
  if (todayUpdates.length >= 3) return 'burst'

  if (book.currentChapter < book.latestChapter) return 'pending'

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

function buildCheckReason(book: Book, hasNew: boolean, daysSince: number): string {
  const scheduleLabel = getScheduleLabel(
    book.updateSchedule.type,
    book.updateSchedule.time,
    book.updateSchedule.days,
    book.updateSchedule.customNote
  )
  if (hasNew) {
    return `在预期更新时间(${scheduleLabel})附近检测到新章节`
  }
  if (daysSince < 1) {
    return `距离上次更新不足1天，符合${scheduleLabel}的预期`
  }
  if (isOverdue(book.updateSchedule.type, daysSince)) {
    return `超过预期时间${Math.floor(daysSince)}天未更新，可能已断更`
  }
  return `已${Math.floor(daysSince)}天无更新，继续等待(${scheduleLabel})`
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
      notifications: [],
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
          updateExpectation: bookData.updateExpectation || '',
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
            notifications: state.notifications.filter((n) => n.bookId !== id),
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

      updateBookExpectation: (bookId, expectation) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId ? { ...b, updateExpectation: expectation } : b
          ),
        }))
      },

      getUnreadCountForBook: (bookId) => {
        const records = get().updateRecords[bookId] || []
        return records.filter((r) => r.status === 'unread').length
      },

      getTotalUnreadCount: () => {
        const all = Object.values(get().updateRecords).flat()
        return all.filter((r) => r.status === 'unread').length
      },

      markAsRead: (id) => {
        set((state) => {
          const book = state.books.find((b) => b.id === id)
          if (!book) return state

          const records = (state.updateRecords[id] || []).map((r) => ({ ...r, status: 'read' as const }))
          const allRecords = { ...state.updateRecords, [id]: records }
          const newStatus = computeBookStatus({ ...book, currentChapter: book.latestChapter }, records)

          return {
            books: state.books.map((b) =>
              b.id === id
                ? { ...b, currentChapter: b.latestChapter, status: newStatus, checkedWithNewChapter: false }
                : b
            ),
            updateRecords: allRecords,
          }
        })
      },

      markAsReadLater: (id) => {
        set((state) => {
          const records = (state.updateRecords[id] || []).map((r) =>
            r.status === 'unread' ? { ...r, status: 'later' as const } : r
          )
          return {
            books: state.books.map((b) =>
              b.id === id ? { ...b, status: 'pending' as const } : b
            ),
            updateRecords: { ...state.updateRecords, [id]: records },
          }
        })
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

      simulateUpdate: (bookId, silent = false) => {
        const book = get().books.find((b) => b.id === bookId)
        if (!book || book.isPaused) return false

        const newChapter = book.latestChapter + 1
        const title = SAMPLE_CHAPTER_TITLES[Math.floor(Math.random() * SAMPLE_CHAPTER_TITLES.length)]
        const wordCount = 2000 + Math.floor(Math.random() * 5000)
        const now = new Date().toISOString()
        const prevStatus = book.status

        const record: UpdateRecord = {
          id: generateId(),
          bookId,
          chapter: newChapter,
          title,
          wordCount,
          updatedAt: now,
          status: 'unread',
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
          const allRecords = [...existingRecords, record]
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const todayUpdates = allRecords.filter(
            (r) => new Date(r.updatedAt).getTime() >= todayStart.getTime()
          )
          const isBurst = todayUpdates.length >= 3
          const newBookData: Book = { ...book, latestChapter: newChapter, lastUpdateTime: now }
          const newStatus: Book['status'] = isBurst ? 'burst' : computeBookStatus(newBookData, allRecords)

          const inQuietTime = get().isQuietTime()
          let newQuietUpdates = state.quietUpdates
          let newSummaries = state.eveningSummaries

          if (inQuietTime) {
            newQuietUpdates = [...state.quietUpdates, quietUpdate]
          }

          let newNotifications = state.notifications
          if (!silent && !inQuietTime) {
            newNotifications = [
              {
                id: generateId(),
                type: 'newChapter',
                bookId,
                bookTitle: book.title,
                title: `${book.title} 更新了`,
                content: `第${newChapter}章 ${title}`,
                chapter: newChapter,
                chapterTitle: title,
                wordCount,
                status: 'unread',
                createdAt: now,
              },
              ...state.notifications,
            ]
          }

          if (prevStatus === 'discontinued' && (newStatus === 'pending' || newStatus === 'burst')) {
            newNotifications = [
              {
                id: generateId(),
                type: 'statusChange',
                bookId,
                bookTitle: book.title,
                title: `${book.title} 恢复更新了`,
                content: `从「断更」变为「${newStatus === 'burst' ? '爆更' : '待补读'}」`,
                fromStatus: 'discontinued',
                toStatus: newStatus,
                status: 'unread',
                createdAt: now,
              },
              ...newNotifications,
            ]
          }

          return {
            books: state.books.map((b) =>
              b.id === bookId ? { ...b, latestChapter: newChapter, lastUpdateTime: now, status: newStatus } : b
            ),
            updateRecords: {
              ...state.updateRecords,
              [bookId]: allRecords,
            },
            quietUpdates: newQuietUpdates,
            eveningSummaries: newSummaries,
            notifications: newNotifications,
          }
        })

        return true
      },

      addUpdateRecord: (recordData) => {
        const record: UpdateRecord = { ...recordData, id: generateId(), status: recordData.status || 'unread' }
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

      setUpdateRecordStatus: (recordId, bookId, status) => {
        set((state) => {
          const records = state.updateRecords[bookId] || []
          const updated = records.map((r) => (r.id === recordId ? { ...r, status } : r))
          const book = state.books.find((b) => b.id === bookId)
          if (!book) return { ...state, updateRecords: { ...state.updateRecords, [bookId]: updated } }
          const newStatus = computeBookStatus(book, updated)
          return {
            books: state.books.map((b) =>
              b.id === bookId ? { ...b, status: newStatus } : b
            ),
            updateRecords: { ...state.updateRecords, [bookId]: updated },
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
        return get().books.filter((b) => (b.status === 'pending' || b.status === 'burst') && !b.isPaused)
      },

      checkAllUpdates: async (silent = false) => {
        if (get().isChecking && !silent) return []
        set({ isChecking: true })

        const results: CheckResult[] = []
        const activeBooks = get().books.filter((b) => !b.isPaused)

        for (const book of activeBooks) {
          await new Promise((r) => setTimeout(r, 150))
          const daysSince = getDaysSinceUpdate(book.lastUpdateTime)
          const overdue = isOverdue(book.updateSchedule.type, daysSince)

          let shouldUpdate: boolean
          if (overdue) {
            shouldUpdate = false
          } else {
            const probability = daysSince < 1 ? 0.2 : daysSince < 2 ? 0.45 : 0.7
            shouldUpdate = Math.random() < probability
          }

          const now = new Date().toISOString()
          let hasNewChapter = false
          let newCount = 0

          if (shouldUpdate) {
            const success = get().simulateUpdate(book.id, silent)
            if (success) {
              hasNewChapter = true
              newCount = 1
            }
          }

          const reason = buildCheckReason(book, hasNewChapter, daysSince)
          const result: CheckResult = {
            bookId: book.id,
            checkedAt: now,
            hasNewChapter,
            newChaptersCount: newCount,
            reason,
          }
          results.push(result)

          const prevBookStatus = book.status
          const latestBook = get().books.find((b) => b.id === book.id)
          const updatedBook = latestBook || book
          const currentRecords = get().updateRecords[book.id] || []
          const newStatus = computeBookStatus(updatedBook, currentRecords)

          if (prevBookStatus !== newStatus) {
            const statusLabels: Record<string, string> = {
              normal: '正常', discontinued: '断更', burst: '爆更', pending: '待补读',
            }
            const notif: NotificationItem = {
              id: generateId(),
              type: 'statusChange',
              bookId: book.id,
              bookTitle: book.title,
              title: `${book.title} 状态变化`,
              content: `从「${statusLabels[prevBookStatus]}」变为「${statusLabels[newStatus]}」`,
              fromStatus: prevBookStatus,
              toStatus: newStatus,
              status: 'unread',
              createdAt: now,
            }
            set((s) => ({ notifications: [notif, ...s.notifications] }))
          }

          set((state) => ({
            books: state.books.map((b) =>
              b.id === book.id
                ? { ...b, lastCheckedAt: now, checkedWithNewChapter: hasNewChapter, status: newStatus }
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
              const uniqueBooks = new Set(quietUpdates.map((u) => u.bookId)).size
              const summary: EveningSummary = {
                id: generateId(),
                date: today,
                updates: [...quietUpdates],
                read: false,
              }
              const notif: NotificationItem = {
                id: generateId(),
                type: 'eveningSummary',
                summaryId: summary.id,
                title: '安静时段更新汇总',
                content: `${uniqueBooks}本小说共${quietUpdates.length}条更新`,
                status: 'unread',
                createdAt: new Date().toISOString(),
              }
              set((state) => ({
                eveningSummaries: [...state.eveningSummaries, summary],
                quietUpdates: [],
                notifications: [notif, ...state.notifications],
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

        const daysSince = getDaysSinceUpdate(book.lastUpdateTime)
        const overdue = isOverdue(book.updateSchedule.type, daysSince)

        let shouldUpdate: boolean
        if (overdue) {
          shouldUpdate = false
        } else {
          const probability = daysSince < 1 ? 0.2 : daysSince < 2 ? 0.45 : 0.7
          shouldUpdate = Math.random() < probability
        }

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

        const reason = buildCheckReason(book, hasNewChapter, daysSince)
        const result: CheckResult = {
          bookId,
          checkedAt: now,
          hasNewChapter,
          newChaptersCount: newCount,
          reason,
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
          const newNotifications: NotificationItem[] = []
          const today = new Date().toISOString().split('T')[0]
          const now = new Date().toISOString()
          const statusLabels: Record<string, string> = {
            normal: '正常', discontinued: '断更', burst: '爆更', pending: '待补读',
          }

          const updatedBooks = state.books.map((book) => {
            const records = state.updateRecords[book.id] || []
            const newStatus = computeBookStatus(book, records)
            if (book.status !== newStatus) {
              const hasTodayNotif = state.notifications.some(
                (n) => n.type === 'statusChange' && n.bookId === book.id && n.createdAt.startsWith(today)
              )
              if (!hasTodayNotif) {
                newNotifications.push({
                  id: generateId(),
                  type: 'statusChange',
                  bookId: book.id,
                  bookTitle: book.title,
                  title: `${book.title} 状态变化`,
                  content: `从「${statusLabels[book.status]}」变为「${statusLabels[newStatus]}」`,
                  fromStatus: book.status,
                  toStatus: newStatus,
                  status: 'unread',
                  createdAt: now,
                })
              }
            }
            return { ...book, status: newStatus }
          })

          return {
            books: updatedBooks,
            notifications: [...newNotifications, ...state.notifications],
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
          notifications: state.notifications.map((n) =>
            n.summaryId === summaryId ? { ...n, status: 'handled' } : n
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
              const uniqueBooks = new Set(quietUpdates.map((u) => u.bookId)).size
              const summary: EveningSummary = {
                id: generateId(),
                date: today,
                updates: [...quietUpdates],
                read: false,
              }
              const notif: NotificationItem = {
                id: generateId(),
                type: 'eveningSummary',
                summaryId: summary.id,
                title: '安静时段更新汇总',
                content: `${uniqueBooks}本小说共${quietUpdates.length}条更新`,
                status: 'unread',
                createdAt: new Date().toISOString(),
              }
              set((state) => ({
                eveningSummaries: [...state.eveningSummaries, summary],
                quietUpdates: [],
                notifications: [notif, ...state.notifications],
              }))
            }
          }
        }

        set({
          isInQuietMode: currentQuiet,
          previousQuietModeState: currentQuiet,
        })
      },

      addNotification: (item) => {
        const notif: NotificationItem = {
          ...item,
          id: generateId(),
          status: item.status || 'unread',
          createdAt: item.createdAt || new Date().toISOString(),
        }
        set((state) => ({ notifications: [notif, ...state.notifications] }))
      },

      setNotificationStatus: (id, status) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, status } : n
          ),
        }))
      },

      markAllNotificationsAs: (status) => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, status })),
        }))
      },

      getUnreadNotificationCount: () => {
        return get().notifications.filter((n) => n.status === 'unread').length
      },

      getTodayNotifications: () => {
        const today = new Date().toISOString().split('T')[0]
        return get().notifications.filter((n) => n.createdAt.startsWith(today))
      },

      getBookCheckHistory: (bookId) => {
        const result = get().checkResults[bookId]
        return result ? [result] : []
      },
    }),
    {
      name: 'bookshelf-storage',
    }
  )
)
