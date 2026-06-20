import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, Clock, Pause, Play, Trash2 } from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'
import StatusBadge from '@/components/StatusBadge'
import UpdateTimeline from '@/components/UpdateTimeline'
import { timeAgo, formatWordCount } from '@/lib/utils'

export default function ReminderDetail() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const book = useBookStore((s) => s.books.find((b) => b.id === bookId))
  const updateRecords = useBookStore((s) => bookId ? (s.updateRecords[bookId] || []) : [])
  const markAsRead = useBookStore((s) => s.markAsRead)
  const markAsReadLater = useBookStore((s) => s.markAsReadLater)
  const pauseTracking = useBookStore((s) => s.pauseTracking)
  const resumeTracking = useBookStore((s) => s.resumeTracking)
  const removeBook = useBookStore((s) => s.removeBook)

  if (!book) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-parchment-100">
        <p className="text-sm text-ink-500">书籍不存在</p>
        <button
          onClick={() => navigate('/')}
          className="mt-3 text-sm text-amber-accent"
        >
          返回书架
        </button>
      </div>
    )
  }

  const unreadCount = book.latestChapter - book.currentChapter
  const latestRecord = [...updateRecords].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]

  return (
    <div className="flex h-full flex-col bg-parchment-100">
      <header className="shrink-0 bg-ink-900 px-4 pb-5 pt-safe">
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-parchment-50 transition-colors hover:bg-ink-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-lg font-bold text-parchment-50 truncate">{book.title}</h1>
            <p className="text-xs text-ink-500 truncate">{book.author} · {book.platform}</p>
          </div>
          <StatusBadge status={book.status} isPaused={book.isPaused} size="md" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
        {latestRecord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <div className="bg-ink-900 px-4 py-3">
              <p className="text-xs text-ink-500">最新更新</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-amber-accent">
                  {latestRecord.chapter}
                </span>
                <span className="text-sm text-parchment-300">章</span>
              </div>
            </div>
            <div className="px-4 py-3">
              <h3 className="font-serif text-base font-semibold text-ink-900">{latestRecord.title}</h3>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                <span>{formatWordCount(latestRecord.wordCount)}</span>
                <span>{timeAgo(latestRecord.updatedAt)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {!latestRecord && unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className="text-center">
              <span className="font-mono text-4xl font-bold text-amber-accent">{unreadCount}</span>
              <p className="mt-1 text-sm text-ink-600">章待补读</p>
            </div>
          </motion.div>
        )}

        <div className="mt-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">进度校准</h3>
          <div className="flex gap-2">
            <button
              onClick={() => markAsRead(book.id)}
              disabled={book.currentChapter === book.latestChapter}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-status-normal/10 py-3 text-sm font-medium text-status-normal transition-all hover:bg-status-normal/20 disabled:opacity-40 active:scale-[0.97]"
            >
              <CheckCircle className="h-4 w-4" />
              已读到最新
            </button>
            <button
              onClick={() => markAsReadLater(book.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-status-pending/10 py-3 text-sm font-medium text-status-pending transition-all hover:bg-status-pending/20 active:scale-[0.97]"
            >
              <Clock className="h-4 w-4" />
              稍后再看
            </button>
            <button
              onClick={() => book.isPaused ? resumeTracking(book.id) : pauseTracking(book.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-parchment-200 py-3 text-sm font-medium text-ink-600 transition-all hover:bg-parchment-300 active:scale-[0.97]"
            >
              {book.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {book.isPaused ? '继续' : '暂停'}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">更新记录</h3>
          <UpdateTimeline records={updateRecords} />
        </div>

        <div className="mt-6 pb-4">
          <button
            onClick={() => {
              removeBook(book.id)
              navigate('/')
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 active:scale-[0.97]"
          >
            <Trash2 className="h-4 w-4" />
            从书架移除
          </button>
        </div>
      </div>
    </div>
  )
}
