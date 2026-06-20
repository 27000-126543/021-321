import { motion } from 'framer-motion'
import { Moon, Clock } from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'

export default function QuietModeBanner() {
  const isInQuietMode = useBookStore((s) => s.isInQuietMode)
  const quietUpdates = useBookStore((s) => s.quietUpdates)
  const settings = useBookStore((s) => s.settings)

  if (!isInQuietMode) return null

  const activePeriod = settings.quietPeriods.find((p) => {
    if (!p.enabled) return false
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = p.start.split(':').map(Number)
    const [endH, endM] = p.end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
          <Moon className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-indigo-500 font-medium">
            安静模式 {activePeriod ? `· ${activePeriod.name}` : ''}
          </p>
          <p className="text-sm font-medium text-ink-800 truncate">
            {quietUpdates.length > 0
              ? `已收集${quietUpdates.length}条更新，安静时段结束后统一提醒`
              : activePeriod
                ? `${activePeriod.start} - ${activePeriod.end}，期间更新将被合并`
                : '更新将被合并，避免打扰'}
          </p>
        </div>
        {quietUpdates.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-mono text-sm font-bold text-indigo-600">{quietUpdates.length}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
