import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Moon, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'
import type { EveningSummary } from '@/types'
import { formatWordCount } from '@/lib/utils'

interface EveningSummaryBannerProps {
  summary: EveningSummary
  onDismiss?: () => void
}

export default function EveningSummaryBanner({ summary, onDismiss }: EveningSummaryBannerProps) {
  const navigate = useNavigate()
  const markSummaryAsRead = useBookStore((s) => s.markSummaryAsRead)
  const [expanded, setExpanded] = useState(false)

  const bookGroups = summary.updates.reduce((acc, update) => {
    if (!acc[update.bookId]) {
      acc[update.bookId] = { title: update.bookTitle, count: 0, updates: [] }
    }
    acc[update.bookId].count++
    acc[update.bookId].updates.push(update)
    return acc
  }, {} as Record<string, { title: string; count: number; updates: typeof summary.updates }>)

  const uniqueBooks = Object.keys(bookGroups).length
  const totalChapters = summary.updates.length

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-800 to-ink-900 text-parchment-50 shadow-lg"
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-amber-accent" />
            <div>
              <p className="text-xs text-ink-400">安静时段更新汇总</p>
              <p className="font-serif text-sm font-semibold">
                {uniqueBooks}本小说更新了{totalChapters}章
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-700 text-ink-400 transition-colors hover:text-parchment-100"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => {
                markSummaryAsRead(summary.id)
                onDismiss?.()
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-700 text-ink-400 transition-colors hover:text-parchment-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {Object.entries(bookGroups).map(([bookId, data]) => (
                <button
                  key={bookId}
                  onClick={() => {
                    markSummaryAsRead(summary.id)
                    navigate(`/reminder/${bookId}`)
                  }}
                  className="flex w-full items-center gap-2 rounded-xl bg-ink-700/50 px-3 py-2 text-left transition-colors hover:bg-ink-700"
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{data.title}</p>
                    <p className="text-xs text-ink-400">
                      {data.count}章更新 · {data.updates.reduce((s, u) => s + u.wordCount, 0).toLocaleString()}字
                    </p>
                  </div>
                  <span className="font-mono text-xs text-amber-accent">
                    +{data.count}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
