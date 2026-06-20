import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle2, BookOpenCheck } from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'

interface CheckingIndicatorProps {
  onManualCheck: () => void
}

export default function CheckingIndicator({ onManualCheck }: CheckingIndicatorProps) {
  const isChecking = useBookStore((s) => s.isChecking)
  const checkResults = useBookStore((s) => s.checkResults)
  const books = useBookStore((s) => s.books)

  const checkedCount = Object.keys(checkResults).length
  const totalActive = books.filter((b) => !b.isPaused).length
  const withNewChapters = Object.values(checkResults).filter((r) => r.hasNewChapter).length

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          {isChecking ? (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5 text-amber-accent animate-spin" />
              <span className="text-xs text-ink-500">
                正在追更检查 ({checkedCount}/{totalActive})
              </span>
            </motion.div>
          ) : checkedCount > 0 ? (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              {withNewChapters > 0 ? (
                <BookOpenCheck className="h-3.5 w-3.5 text-status-pending" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-status-normal" />
              )}
              <span className="text-xs text-ink-500">
                {withNewChapters > 0
                  ? `${withNewChapters}本有新章`
                  : checkedCount === totalActive
                    ? '全部已检查'
                    : `已检查${checkedCount}本`}
              </span>
            </motion.div>
          ) : (
            <span className="text-xs text-ink-500">点击右侧按钮手动追更检查</span>
          )}
        </AnimatePresence>
      </div>
      <button
        onClick={onManualCheck}
        disabled={isChecking || totalActive === 0}
        className="flex items-center gap-1 text-xs font-medium text-amber-accent transition-colors hover:text-amber-dark disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? '检查中' : '检查更新'}
      </button>
    </div>
  )
}
