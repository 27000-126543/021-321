import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Book } from '@/types'
import StatusBadge from './StatusBadge'
import { timeAgo, formatChapter, getScheduleLabel } from '@/lib/utils'
import { ChevronRight, Clock, CheckCircle, BookOpenCheck } from 'lucide-react'

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
          <div className="flex items-center gap-1.5">
            {book.status === 'discontinued' && (
              <span className="text-[10px] text-status-discontinued bg-red-50 px-1.5 py-0.5 rounded">
                久未更新
              </span>
            )}
            {book.status === 'pending' && (
              <span className="text-xs font-medium text-status-pending bg-blue-50 px-1.5 py-0.5 rounded">
                +{book.latestChapter - book.currentChapter}章未读
              </span>
            )}
            {book.status === 'burst' && (
              <span className="text-xs font-medium text-status-burst bg-amber-50 px-1.5 py-0.5 rounded">
                爆更中
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-ink-500 min-w-0">
            <Clock className="h-3 w-3 shrink-0 text-ink-400" />
            <span className="truncate">
              {getScheduleLabel(book.updateSchedule.type, book.updateSchedule.time, book.updateSchedule.days, book.updateSchedule.customNote)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {book.lastCheckedAt && (
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${
                  book.checkedWithNewChapter
                    ? 'bg-status-pending/10 text-status-pending font-medium'
                    : 'bg-ink-50 text-ink-400'
                }`}
              >
                {book.checkedWithNewChapter
                  ? <><BookOpenCheck className="h-2.5 w-2.5" />有新章</>
                  : <><CheckCircle className="h-2.5 w-2.5" />已检查</>
                }
                <span className="text-ink-400">· {timeAgo(book.lastCheckedAt)}</span>
              </span>
            )}
            <span className="text-[10px] text-ink-400">
              更新于 {timeAgo(book.lastUpdateTime)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
