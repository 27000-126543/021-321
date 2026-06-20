import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpenCheck, Clock, CheckCircle2, AlertTriangle,
  Moon, Filter, Check, Bell,
} from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'
import type { NotificationFilter, NotificationItem } from '@/types'
import { timeAgo, formatWordCount } from '@/lib/utils'

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'handled', label: '已处理' },
  { key: 'later', label: '稍后看' },
]

function getTypeIcon(type: NotificationItem['type']) {
  switch (type) {
    case 'newChapter': return <BookOpenCheck className="h-4 w-4 text-status-pending" />
    case 'eveningSummary': return <Moon className="h-4 w-4 text-indigo-500" />
    case 'statusChange': return <AlertTriangle className="h-4 w-4 text-amber-accent" />
  }
}

function getStatusBadge(status: NotificationItem['status']) {
  switch (status) {
    case 'unread':
      return (
        <span className="inline-flex items-center rounded-full bg-status-pending/10 text-status-pending px-2 py-0.5 text-[10px] font-medium">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-status-pending" />
          未读
        </span>
      )
    case 'handled':
      return <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 text-[10px] font-medium">已处理</span>
    case 'later':
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-parchment-200 text-ink-600 px-2 py-0.5 text-[10px] font-medium">
          <Clock className="h-2.5 w-2.5" />
          稍后看
        </span>
      )
  }
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const notifications = useBookStore((s) => s.notifications)
  const books = useBookStore((s) => s.books)
  const setNotificationStatus = useBookStore((s) => s.setNotificationStatus)
  const markAllNotificationsAs = useBookStore((s) => s.markAllNotificationsAs)
  const getUnreadNotificationCount = useBookStore((s) => s.getUnreadNotificationCount)

  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [bookFilter, setBookFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let result = notifications
    if (filter !== 'all') {
      result = result.filter((n) => n.status === filter)
    }
    if (bookFilter !== 'all') {
      result = result.filter((n) => n.bookId === bookFilter)
    }
    return result
  }, [notifications, filter, bookFilter])

  const today = new Date().toISOString().split('T')[0]
  const todayCount = notifications.filter((n) => n.createdAt.startsWith(today)).length
  const unreadCount = getUnreadNotificationCount()
  const booksWithNotifs = useMemo(() => {
    const ids = new Set(notifications.map((n) => n.bookId).filter(Boolean) as string[])
    return books.filter((b) => ids.has(b.id))
  }, [books, notifications])

  const handleClick = (n: NotificationItem) => {
    if (n.bookId) {
      setNotificationStatus(n.id, 'handled')
      navigate(`/reminder/${n.bookId}`)
    } else if (n.type === 'eveningSummary' && n.summaryId) {
      setNotificationStatus(n.id, 'handled')
      navigate('/')
    } else {
      setNotificationStatus(n.id, 'handled')
    }
  }

  return (
    <div className="flex h-full flex-col bg-parchment-100">
      <header className="shrink-0 bg-ink-900 px-4 pb-3 pt-safe">
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-parchment-50 transition-colors hover:bg-ink-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg font-bold text-parchment-50">提醒中心</h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-amber-accent px-1.5 h-4 min-w-4 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              今日 {todayCount} 条提醒
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllNotificationsAs('handled')}
              className="flex items-center gap-1 rounded-full bg-ink-700 px-3 py-1.5 text-xs text-amber-accent transition-colors hover:bg-ink-600"
            >
              <Check className="h-3 w-3" />
              全部处理
            </button>
          )}
        </div>
      </header>

      <div className="shrink-0 border-b border-parchment-200 bg-parchment-50">
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                filter === f.key
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-parchment-200 bg-white text-ink-600 hover:border-ink-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {booksWithNotifs.length > 0 && (
          <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
            <Filter className="h-3 w-3 text-ink-500 shrink-0" />
            <button
              onClick={() => setBookFilter('all')}
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                bookFilter === 'all'
                  ? 'bg-ink-900 text-white'
                  : 'bg-parchment-100 text-ink-600 hover:bg-parchment-200'
              }`}
            >
              全部书籍
            </button>
            {booksWithNotifs.map((b) => (
              <button
                key={b.id}
                onClick={() => setBookFilter(b.id)}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] transition-colors truncate max-w-[120px] ${
                  bookFilter === b.id
                    ? 'bg-ink-900 text-white'
                    : 'bg-parchment-100 text-ink-600 hover:bg-parchment-200'
                }`}
              >
                {b.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 scrollbar-hide">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-parchment-200">
              <Bell className="h-6 w-6 text-ink-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-ink-800">
              {filter === 'all' ? '暂无提醒' : `暂无${FILTERS.find((f) => f.key === filter)?.label}的提醒`}
            </p>
            <p className="mt-1 text-xs text-ink-500">新章更新和状态变化都会出现在这里</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filtered.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 overflow-hidden"
            >
              <button
                onClick={() => handleClick(n)}
                className={`w-full rounded-xl border text-left transition-all hover:shadow-sm ${
                  n.status === 'unread'
                    ? 'border-ink-900/10 bg-white'
                    : 'border-parchment-200 bg-parchment-50 opacity-80'
                }`}
              >
                <div className="px-3.5 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-parchment-100">
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${
                          n.status === 'unread' ? 'text-ink-900' : 'text-ink-700'
                        }`}>
                          {n.title}
                        </p>
                        {getStatusBadge(n.status)}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500 truncate">{n.content}</p>
                      {n.chapter && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-amber-accent">
                            第{n.chapter}章
                          </span>
                          {n.chapterTitle && (
                            <span className="text-xs text-ink-600 truncate">
                              {n.chapterTitle}
                            </span>
                          )}
                          {n.wordCount && (
                            <span className="text-xs text-ink-400">
                              {formatWordCount(n.wordCount)}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-ink-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-1.5 pt-2 border-t border-parchment-100">
                    <span
                      onClick={(e) => { e.stopPropagation(); setNotificationStatus(n.id, 'later') }}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] text-ink-600 hover:bg-parchment-100 transition-colors cursor-pointer"
                    >
                      <Clock className="h-3 w-3" />
                      稍后看
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); setNotificationStatus(n.id, 'handled') }}
                      className="inline-flex items-center gap-1 rounded-lg bg-status-normal/10 px-2.5 py-1 text-[11px] text-status-normal hover:bg-status-normal/20 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      标记已处理
                    </span>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
