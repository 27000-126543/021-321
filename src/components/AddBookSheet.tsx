import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'
import { PLATFORMS, DAY_LABELS } from '@/types'
import type { UpdateSchedule } from '@/types'

interface AddBookSheetProps {
  open: boolean
  onClose: () => void
}

export default function AddBookSheet({ open, onClose }: AddBookSheetProps) {
  const addBook = useBookStore((s) => s.addBook)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [platform, setPlatform] = useState<string>(PLATFORMS[0])
  const [currentChapter, setCurrentChapter] = useState('')
  const [scheduleType, setScheduleType] = useState<UpdateSchedule['type']>('daily')
  const [scheduleTime, setScheduleTime] = useState('22:00')
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [customNote, setCustomNote] = useState('')

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = () => {
    if (!title.trim() || !author.trim() || !currentChapter) return

    addBook({
      title: title.trim(),
      author: author.trim(),
      platform,
      currentChapter: parseInt(currentChapter, 10),
      updateSchedule: {
        type: scheduleType,
        time: scheduleTime,
        days: scheduleType === 'weekly' ? selectedDays.sort() : undefined,
        customNote: scheduleType === 'custom' ? customNote : undefined,
      },
    })

    setTitle('')
    setAuthor('')
    setPlatform(PLATFORMS[0])
    setCurrentChapter('')
    setScheduleType('daily')
    setScheduleTime('22:00')
    setSelectedDays([1, 2, 3, 4, 5])
    setCustomNote('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-parchment-50 scrollbar-hide"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-parchment-200 bg-parchment-50/95 px-5 py-4 backdrop-blur-sm">
              <h2 className="font-serif text-lg font-semibold text-ink-900">添加追更</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-parchment-100 text-ink-600 transition-colors hover:bg-parchment-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-8 pt-4 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-600">书名</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入小说名称"
                  className="w-full rounded-xl border border-parchment-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-parchment-300 focus:border-ink-600 focus:outline-none focus:ring-1 focus:ring-ink-600/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-600">作者</label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="输入作者笔名"
                  className="w-full rounded-xl border border-parchment-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-parchment-300 focus:border-ink-600 focus:outline-none focus:ring-1 focus:ring-ink-600/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-600">来源平台</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        platform === p
                          ? 'border-ink-900 bg-ink-900 text-white'
                          : 'border-parchment-200 bg-white text-ink-600 hover:border-ink-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-600">当前读到第几章</label>
                <input
                  type="number"
                  min="1"
                  value={currentChapter}
                  onChange={(e) => setCurrentChapter(e.target.value)}
                  placeholder="输入章节号"
                  className="w-full rounded-xl border border-parchment-200 bg-white px-3.5 py-2.5 text-sm font-mono text-ink-900 placeholder:text-parchment-300 focus:border-ink-600 focus:outline-none focus:ring-1 focus:ring-ink-600/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-600">更新规律</label>
                <div className="flex gap-2 mb-3">
                  {([
                    { value: 'daily', label: '每日' },
                    { value: 'weekly', label: '每周' },
                    { value: 'custom', label: '自定义' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setScheduleType(opt.value)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                        scheduleType === opt.value
                          ? 'border-ink-900 bg-ink-900 text-white'
                          : 'border-parchment-200 bg-white text-ink-600 hover:border-ink-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-500 shrink-0">更新时间</span>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="rounded-xl border border-parchment-200 bg-white px-3 py-2 text-sm font-mono text-ink-900 focus:border-ink-600 focus:outline-none"
                  />
                </div>

                {scheduleType === 'weekly' && (
                  <div className="mt-3 flex gap-1.5">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleDay(idx)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-all ${
                          selectedDays.includes(idx)
                            ? 'bg-ink-900 text-white'
                            : 'bg-parchment-100 text-ink-500'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {scheduleType === 'custom' && (
                  <input
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="描述更新规律，如「不定期更新」"
                    className="mt-3 w-full rounded-xl border border-parchment-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-parchment-300 focus:border-ink-600 focus:outline-none focus:ring-1 focus:ring-ink-600/20"
                  />
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !author.trim() || !currentChapter}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-accent py-3 text-sm font-semibold text-white transition-all hover:bg-amber-dark disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                加入书架
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
