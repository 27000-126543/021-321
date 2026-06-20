import type { UpdateRecord } from '@/types'
import { timeAgo, formatWordCount } from '@/lib/utils'
import { motion } from 'framer-motion'

interface UpdateTimelineProps {
  records: UpdateRecord[]
}

export default function UpdateTimeline({ records }: UpdateTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-ink-500">
        暂无更新记录
      </div>
    )
  }

  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-parchment-200" />

      <div className="space-y-4">
        {sortedRecords.map((record, index) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-ink-600 bg-white" />

            <div className="rounded-xl bg-parchment-50 px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-ink-900">
                  第{record.chapter}章
                </span>
                <span className="text-xs text-ink-500">{timeAgo(record.updatedAt)}</span>
              </div>
              <p className="mt-0.5 text-sm text-ink-800 font-serif">{record.title}</p>
              <p className="mt-0.5 text-xs text-ink-500">{formatWordCount(record.wordCount)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
