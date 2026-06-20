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
  simulateUpdate: (bookId: string) => boolean
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

function getHoursSinceUpdate(lastUpdateTime: string): number {
  const lastUpdate = new Date(lastUpdateTime)
  const now = new Date()
  return (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
}

function getDaysSinceUpdate(lastUpdateTime: string): number {
  return getHoursSinceUpdate(lastUpdateTime) / 24
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

function notifStatusFromRecord(status: UpdateRecordStatus): NotificationStatus {
  return status === 'read' ? 'handled' : status === 'later' ? 'later' : 'unread'
}

function recordStatusFromNotif(status: NotificationStatus): UpdateRecordStatus {
  return status === 'handled' ? 'read' : status === 'later' ? 'later' : 'unread'
}

function determineCheckResult(book: Book): { shouldFindUpdate: boolean; reason: string } {
  const now = new Date()
  const hoursSince = getHoursSinceUpdate(book.lastUpdateTime)
  const daysSince = hoursSince / 24

  const scheduleType = book.updateSchedule.type
  const scheduleTime = book.updateSchedule.time
  const [sHour, sMinute] = scheduleTime.split(':').map(Number)
  const scheduleMinutes = sHour * 60 + sMinute
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentDay = now.getDay()

  const scheduleLabel = getScheduleLabel(scheduleType, scheduleTime, book.updateSchedule.days, book.updateSchedule.customNote)
  const expectation = book.updateExpectation
  const expectationSuffix = expectation ? `。预期说明：${expectation}` : ''

  if (isOverdue(scheduleType, daysSince)) {
    return {
      shouldFindUpdate: false,
      reason: `超过预期更新时间${Math.floor(daysSince)}天未更新，可能已断更(${scheduleLabel})${expectationSuffix}`,
    }
  }

  let isRightDay = true
  if (scheduleType === 'weekly' && book.updateSchedule.days && book.updateSchedule.days.length > 0) {
    isRightDay = book.updateSchedule.days.includes(currentDay)
  }

  const pastScheduledTime = currentMinutes >= scheduleMinutes

  if (scheduleType === 'daily') {
    if (hoursSince >= 20 && pastScheduledTime) {
      return {
        shouldFindUpdate: true,
        reason: `已过预期更新时间(${scheduleTime})，距上次更新${Math.floor(hoursSince)}小时，检测到新章节${expectationSuffix}`,
      }
    }
    if (hoursSince < 2) {
      return {
        shouldFindUpdate: false,
        reason: `距上次更新仅${Math.floor(hoursSince * 60)}分钟，尚未到更新间隔`,
      }
    }
    if (!pastScheduledTime) {
      return {
        shouldFindUpdate: false,
        reason: `尚未到预期更新时间(${scheduleTime})，继续等待${expectationSuffix}`,
      }
    }
    return {
      shouldFindUpdate: false,
      reason: `距上次更新${Math.floor(hoursSince)}小时，尚未达到每日更新间隔${expectationSuffix}`,
    }
  }

  if (scheduleType === 'weekly') {
    if (!isRightDay) {
      const dayNames = ['日', '一', '二', '三', '四', '五', '六']
      return {
        shouldFindUpdate: false,
        reason: `今天周${dayNames[currentDay]}不是更新日(${scheduleLabel})${expectationSuffix}`,
      }
    }
    if (daysSince >= 5 && pastScheduledTime) {
      return {
        shouldFindUpdate: true,
        reason: `更新日已到(${scheduleLabel})，距上次更新${Math.floor(daysSince)}天，检测到新章节${expectationSuffix}`,
      }
    }
    if (daysSince < 1) {
      return {
        shouldFindUpdate: false,
        reason: `距上次更新不足1天，尚未到周更新间隔`,
      }
    }
    if (!pastScheduledTime) {
      return {
        shouldFindUpdate: false,
        reason: `今天是更新日但尚未到预期时间(${scheduleTime})${expectationSuffix}`,
      }
    }
    return {
      shouldFindUpdate: false,
      reason: `距上次更新${Math.floor(daysSince)}天，继续等待(${scheduleLabel})${expectationSuffix}`,
    }
  }

  if (daysSince >= 3 && pastScheduledTime) {
    return {
      shouldFindUpdate: true,
      reason: `距上次更新${Math.floor(daysSince)}天，检测到新章节${book.updateSchedule.customNote ? `（${book.updateSchedule.customNote}）` : ''}${expectationSuffix}`,
    }
  }
  if (daysSince < 1) {
    return {
      shouldFindUpdate: false,
      reason: `距上次更新不足1天，继续等待`,
    }
  }
  return {
    shouldFindUpdate: false,
    reason: `距上次更新${Math.floor(daysSince)}天，继续等待(${scheduleLabel})${expectationSuffix}`,
  }
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

          const updatedNotifications = state.notifications.map((n) => {
            if (n.type === 'newChapter' && n.bookId === id && n.status !== 'handled') {
              return { ...n, status: 'handled' as const }
            }
            return n
          })

          return {
            books: state.books.map((b) =>
              b.id === id
                ? { ...b, currentChapter: b.latestChapter, status: newStatus, checkedWithNewChapter: false }
                : b
            ),
            updateRecords: allRecords,
            notifications: updatedNotifications,
          }
        })
      },

      markAsReadLater: (id) => {
        set((state) => {
          const records = (state.updateRecords[id] || []).map((r) =>
            r.status === 'unread' ? { ...r, status: 'later' as const } : r
          )

          const updatedNotifications = state.notifications.map((n) => {
            if (n.type === 'newChapter' && n.bookId === id && n.status === 'unread') {
              return { ...n, status: 'later' as const }
            }
            return n
          })

          return {
            books: state.books.map((b) =>
              b.id === id ? { ...b, status: 'pending' as const } : b
            ),
            updateRecords: { ...state.updateRecords, [id]: records },
            notifications: updatedNotifications,
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

      simulateUpdate: (bookId) => {
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

          if (inQuietTime) {
            newQuietUpdates = [...state.quietUpdates, quietUpdate]
          }

          let newNotifications = state.notifications

          if (!inQuietTime) {
            newNotifications = [
              {
                id: generateId(),
                type: 'newChapter' as const,
                bookId,
                bookTitle: book.title,
                title: `${book.title} 更新了`,
                content: `第${newChapter}章 ${title}`,
                chapter: newChapter,
                chapterTitle: title,
                wordCount,
                status: 'unread' as const,
                createdAt: now,
              },
              ...state.notifications,
            ]
          }

          if (prevStatus === 'discontinued' && (newStatus === 'pending' || newStatus === 'burst')) {
            newNotifications = [
              {
                id: generateId(),
                type: 'statusChange' as const,
                bookId,
                bookTitle: book.title,
                title: `${book.title} 恢复更新了`,
                content: `从「断更」变为「${newStatus === 'burst' ? '爆更' : '待补读'}」`,
                fromStatus: 'discontinued',
                toStatus: newStatus,
                status: 'unread' as const,
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
            eveningSummaries: state.eveningSummaries,
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
          const targetRecord = records.find((r) => r.id === recordId)
          const updated = records.map((r) => (r.id === recordId ? { ...r, status } : r))

          const notifStatus = notifStatusFromRecord(status)
          const updatedNotifications = targetRecord
            ? state.notifications.map((n) => {
                if (n.type === 'newChapter' && n.bookId === bookId && n.chapter === targetRecord.chapter) {
                  return { ...n, status: notifStatus }
                }
                return n
              })
            : state.notifications

          const book = state.books.find((b) => b.id === bookId)
          if (!book) return {
            ...state,
            updateRecords: { ...state.updateRecords, [bookId]: updated },
            notifications: updatedNotifications,
          }
          const newStatus = computeBookStatus(book, updated)
          return {
            books: state.books.map((b) =>
              b.id === bookId ? { ...b, status: newStatus } : b
            ),
            updateRecords: { ...state.updateRecords, [bookId]: updated },
            notifications: updatedNotifications,
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

      checkAllUpdates: async (_silent = false) => {
        if (get().isChecking) return []
        set({ isChecking: true })

        const results: CheckResult[] = []
        const activeBooks = get().books.filter((b) => !b.isPaused)

        for (const book of activeBooks) {
          await new Promise((r) => setTimeout(r, 150))

          const { shouldFindUpdate, reason } = determineCheckResult(book)

          const now = new Date().toISOString()
          let hasNewChapter = false
          let newCount = 0

          if (shouldFindUpdate) {
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

        const { shouldFindUpdate, reason } = determineCheckResult(book)

        const now = new Date().toISOString()
        let hasNewChapter = false
        let newCount = 0

        if (shouldFindUpdate) {
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
          reason,
        }

        const latestBook = get().books.find((b) => b.id === bookId)
        const currentRecords = get().updateRecords[bookId] || []
        const newBookStatus = latestBook ? computeBookStatus(latestBook, currentRecords) : book.status

        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId
              ? { ...b, lastCheckedAt: now, checkedWithNewChapter: hasNewChapter, status: newBookStatus }
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
        set((state) => {
          const targetNotif = state.notifications.find((n) => n.id === id)
          let updatedRecords = state.updateRecords
          let updatedBooks = state.books

          if (targetNotif && targetNotif.type === 'newChapter' && targetNotif.bookId && targetNotif.chapter != null) {
            const bookId = targetNotif.bookId
            const chapter = targetNotif.chapter
            const recordStatus = recordStatusFromNotif(status)
            const records = state.updateRecords[bookId] || []
            const updated = records.map((r) =>
              r.chapter === chapter ? { ...r, status: recordStatus } : r
            )
            updatedRecords = { ...state.updateRecords, [bookId]: updated }

            const book = state.books.find((b) => b.id === bookId)
            if (book) {
              const newBookStatus = computeBookStatus(book, updated)
              updatedBooks = state.books.map((b) =>
                b.id === bookId ? { ...b, status: newBookStatus } : b
              )
            }
          }

          return {
            books: updatedBooks,
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, status } : n
            ),
            updateRecords: updatedRecords,
          }
        })
      },

      markAllNotificationsAs: (status) => {
        set((state) => {
          const recordStatus = recordStatusFromNotif(status)
          let updatedRecords = { ...state.updateRecords }

          const affectedBookChapters = state.notifications
            .filter((n) => n.type === 'newChapter' && n.bookId && n.chapter != null && n.status !== status)
            .map((n) => ({ bookId: n.bookId!, chapter: n.chapter! }))

          const affectedBookIds = new Set(affectedBookChapters.map((a) => a.bookId))

          for (const bookId of affectedBookIds) {
            const chapters = affectedBookChapters.filter((a) => a.bookId === bookId).map((a) => a.chapter)
            const records = state.updateRecords[bookId] || []
            updatedRecords[bookId] = records.map((r) =>
              chapters.includes(r.chapter) ? { ...r, status: recordStatus } : r
            )
          }

          let updatedBooks = state.books
          for (const bookId of affectedBookIds) {
            const book = state.books.find((b) => b.id === bookId)
            if (book) {
              const records = updatedRecords[bookId] || []
              const newBookStatus = computeBookStatus(book, records)
              updatedBooks = updatedBooks.map((b) =>
                b.id === bookId ? { ...b, status: newBookStatus } : b
              )
            }
          }

          return {
            books: updatedBooks,
            notifications: state.notifications.map((n) => ({ ...n, status })),
            updateRecords: updatedRecords,
          }
        })
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
