import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CheckCircle, Clock, Pause, Play, Trash2,
  RefreshCw, Pencil, Check, X, Info,
} from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'
import StatusBadge from '@/components/StatusBadge'
import UpdateTimeline from '@/components/UpdateTimeline'
import { timeAgo, formatWordCount, getScheduleLabel } from '@/lib/utils'

export default function ReminderDetail() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const book = useBookStore((s) => s.books.find((b) => b.id === bookId))
  const updateRecords = useBookStore((s) => bookId ? (s.updateRecords[bookId] || []) : [])
  const checkResults = useBookStore((s) => bookId ? (s.checkResults[bookId] || null) : null)
  const markAsRead = useBookStore((s) => s.markAsRead)
  const markAsReadLater = useBookStore((s) => s.markAsReadLater)
  const pauseTracking = useBookStore((s) => s.pauseTracking)
  const resumeTracking = useBookStore((s) => s.resumeTracking)
  const removeBook = useBookStore((s) => s.removeBook)
  const checkSingleBook = useBookStore((s) => s.checkSingleBook)
  const updateBookExpectation = useBookStore((s) => s.updateBookExpectation)
  const getUnreadCountForBook = useBookStore((s) => s.getUnreadCountForBook)

  const [editingExpectation, setEditingExpectation] = useState(false)
  const [expectationDraft, setExpectationDraft] = useState('')
  const [isChecking, setIsChecking] = useState(false)

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

  const unreadCount = getUnreadCountForBook(book.id)
  const latestRecord = [...updateRecords].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]

  const handleCheck = async () => {
    setIsChecking(true)
    checkSingleBook(book.id)
    setTimeout(() => setIsChecking(false), 300)
  }

  const startEditExpectation = () => {
    setExpectationDraft(book.updateExpectation || '')
    setEditingExpectation(true)
  }

  const saveExpectation = () => {
    updateBookExpectation(book.id, expectationDraft.trim())
    setEditingExpectation(false)
  }

  const cancelEditExpectation = () => {
    setExpectationDraft('')
    setEditingExpectation(false)
  }

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

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-ink-400">
            <Clock className="h-3 w-3" />
            <span>
              {getScheduleLabel(book.updateSchedule.type, book.updateSchedule.time, book.updateSchedule.days, book.updateSchedule.customNote)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-ink-400">
            <RefreshCw className="h-3 w-3" />
            <span>
              {book.lastCheckedAt ? `上次检查 ${timeAgo(book.lastCheckedAt)}` : '尚未检查'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
        {latestRecord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <div className="bg-ink-900 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-ink-500">最新更新</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-amber-accent">
                    {latestRecord.chapter}
                  </span>
                  <span className="text-sm text-parchment-300">章</span>
                  {latestRecord.status === 'unread' && (
                    <span className="text-[10px] bg-status-pending/20 text-status-pending px-1.5 py-0.5 rounded font-medium">
                      未读
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleCheck}
                disabled={isChecking}
                className="flex items-center gap-1.5 rounded-full bg-ink-700 px-3 py-1.5 text-xs text-amber-accent transition-colors hover:bg-ink-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                检查更新
              </button>
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

        {!latestRecord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-serif text-sm font-semibold text-ink-800">暂无更新记录</p>
              <p className="text-xs text-ink-500 mt-0.5">已读到第 {book.currentChapter} 章</p>
            </div>
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="flex items-center gap-1.5 rounded-full bg-amber-accent/10 px-3 py-1.5 text-xs font-medium text-amber-accent hover:bg-amber-accent/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              检查更新
            </button>
          </motion.div>
        )}

        {checkResults && (
          <div className="mt-3 rounded-xl border border-parchment-200 bg-white/50 px-3.5 py-2.5">
            <div className="flex items-start gap-2">
              <Info className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                checkResults.hasNewChapter ? 'text-status-pending' : 'text-ink-400'
              }`} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-ink-700">
                  检查判定：{checkResults.hasNewChapter ? '发现新章节' : '暂无新章节'}
                </p>
                <p className="text-[11px] text-ink-500 mt-0.5 leading-relaxed">{checkResults.reason}</p>
                {checkResults.checkedAt && (
                  <p className="text-[10px] text-ink-400 mt-1">{timeAgo(checkResults.checkedAt)} · {checkResults.checkedAt.split('T')[1]?.slice(0, 5) || ''}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5 text-ink-500" />
              <p className="text-xs font-semibold text-ink-700">更新预期说明</p>
            </div>
            {!editingExpectation && (
              <button
                onClick={startEditExpectation}
                className="text-[11px] text-amber-accent font-medium"
              >
                编辑
              </button>
            )}
          </div>
          <AnimatePresence mode="wait">
            {editingExpectation ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <textarea
                  value={expectationDraft}
                  onChange={(e) => setExpectationDraft(e.target.value)}
                  placeholder="如:作者一般每晚22点更,周末偶尔爆更"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2 text-xs text-ink-800 placeholder:text-parchment-300 focus:border-ink-600 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEditExpectation}
                    className="flex items-center gap-1 rounded-lg bg-parchment-100 px-2.5 py-1 text-[11px] text-ink-600 hover:bg-parchment-200 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    取消
                  </button>
                  <button
                    onClick={saveExpectation}
                    className="flex items-center gap-1 rounded-lg bg-ink-900 px-2.5 py-1 text-[11px] text-white hover:bg-ink-800 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    保存
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-ink-600 leading-relaxed"
              >
                {book.updateExpectation ? book.updateExpectation : '未填写预期。可以记录作者的更新习惯，比如"每周一三五晚22点更新，每章3000字左右"，方便对照检查结果。'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">阅读进度</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-status-pending">{unreadCount}条未读</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => markAsRead(book.id)}
              disabled={unreadCount === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-status-normal/10 py-3 text-sm font-medium text-status-normal transition-all hover:bg-status-normal/20 disabled:opacity-40 active:scale-[0.97]"
            >
              <CheckCircle className="h-4 w-4" />
              全部已读
            </button>
            <button
              onClick={() => markAsReadLater(book.id)}
              disabled={unreadCount === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-status-pending/10 py-3 text-sm font-medium text-status-pending transition-all hover:bg-status-pending/20 disabled:opacity-40 active:scale-[0.97]"
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
          <UpdateTimeline records={updateRecords} bookId={book.id} />
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
