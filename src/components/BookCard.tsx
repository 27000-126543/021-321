import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Book } from '@/types'
import StatusBadge from './StatusBadge'
import { timeAgo, formatChapter, getScheduleLabel } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface BookCardProps {
  book: Book
}

const STATUS_BORDER_COLORS: Record<Book['status'], string> = {
  normal: '#5CB85C',
  discontinued: '#E85D4A',
  burst: '#F0B429',
  pending: '#4A90D9',
}

export default function BookCard({ book }: BookCardProps) {
  const navigate = useNavigate()

  const borderColor = book.isPaused ? '#9CA3AF' : STATUS_BORDER_COLORS[book.status]
  const unreadCount = book.latestChapter - book.currentChapter

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/reminder/${book.id}`)}
      className="relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: borderColor }}
      />

      <div className="px-4 py-3.5 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-base font-semibold text-ink-900 truncate">
              {book.title}
            </h3>
            <p className="mt-0.5 text-xs text-ink-600 truncate">
              {book.author} · {book.platform}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={book.status} isPaused={book.isPaused} />
            <ChevronRight className="w-4 h-4 text-parchment-300" />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <p className="text-xs text-ink-600 font-mono">
            {formatChapter(book.currentChapter, book.latestChapter)}
          </p>
          {unreadCount > 0 && (
            <span className="text-xs font-medium text-status-pending bg-blue-50 px-1.5 py-0.5 rounded">
              +{unreadCount}章未读
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
          <span>{getScheduleLabel(book.updateSchedule.type, book.updateSchedule.time, book.updateSchedule.days, book.updateSchedule.customNote)}</span>
          <div className="flex items-center gap-2">
            {book.lastCheckedAt && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                book.checkedWithNewChapter
                  ? 'bg-status-pending/10 text-status-pending font-medium'
                  : 'bg-ink-50 text-ink-400'
              }`}>
                {book.checkedWithNewChapter ? '有新章' : '已检查'}
              </span>
            )}
            <span>{timeAgo(book.lastUpdateTime)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
