import { motion } from 'framer-motion'
import { Check, Clock } from 'lucide-react'
import type { UpdateRecord, UpdateRecordStatus } from '@/types'
import { timeAgo, formatWordCount } from '@/lib/utils'
import { useBookStore } from '@/store/useBookStore'

interface UpdateTimelineProps {
  records: UpdateRecord[]
  bookId: string
}

const STATUS_LABELS: Record<UpdateRecordStatus, string> = {
  unread: '未读',
  read: '已处理',
  later: '稍后看',
}

const STATUS_STYLES: Record<UpdateRecordStatus, string> = {
  unread: 'bg-status-pending/10 text-status-pending border-status-pending/20',
  read: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  later: 'bg-amber-50 text-amber-600 border-amber-200',
}

export default function UpdateTimeline({ records, bookId }: UpdateTimelineProps) {
  const setUpdateRecordStatus = useBookStore((s) => s.setUpdateRecordStatus)

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

      <div className="space-y-3">
        {sortedRecords.map((record, index) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <div
              className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 bg-white ${
                record.status === 'unread'
                  ? 'border-status-pending'
                  : record.status === 'read'
                  ? 'border-emerald-500'
                  : 'border-amber-500'
              }`}
            />

            <div className={`rounded-xl border px-3.5 py-3 ${STATUS_STYLES[record.status]}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold">第{record.chapter}章</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_STYLES[record.status]}`}>
                  {STATUS_LABELS[record.status]}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-semibold font-serif">{record.title}</p>
              <div className="mt-0.5 flex items-center justify-between text-[11px] opacity-80">
                <span>{formatWordCount(record.wordCount)}</span>
                <span>{timeAgo(record.updatedAt)}</span>
              </div>

              {record.status !== 'read' && (
                <div className="mt-2.5 pt-2.5 border-t border-current/10 flex items-center gap-1.5">
                  {record.status === 'unread' && (
                    <button
                      onClick={() => setUpdateRecordStatus(record.id, bookId, 'later')}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] bg-white/50 hover:bg-white transition-colors"
                    >
                      <Clock className="h-3 w-3" />
                      稍后看
                    </button>
                  )}
                  <button
                    onClick={() => setUpdateRecordStatus(record.id, bookId, 'read')}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] bg-white/80 hover:bg-white transition-colors font-medium"
                  >
                    <Check className="h-3 w-3" />
                    标记已读
                  </button>
                  {record.status === 'later' && (
                    <button
                      onClick={() => setUpdateRecordStatus(record.id, bookId, 'unread')}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] bg-white/50 hover:bg-white transition-colors"
                    >
                      恢复未读
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
