import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, BellOff, Volume2, VolumeX, Vibrate, Moon,
  Plus, Trash2, Clock, Download, Upload, AlertTriangle,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'
import { useUpdateChecker } from '@/hooks/useUpdateChecker'
import EveningSummaryBanner from '@/components/EveningSummaryBanner'
import QuietModeBanner from '@/components/QuietModeBanner'
import type { QuietPeriod, ReadingTimeSlot } from '@/types'

export default function Settings() {
  const settings = useBookStore((s) => s.settings)
  const updateSettings = useBookStore((s) => s.updateSettings)
  const addQuietPeriod = useBookStore((s) => s.addQuietPeriod)
  const removeQuietPeriod = useBookStore((s) => s.removeQuietPeriod)
  const updateQuietPeriod = useBookStore((s) => s.updateQuietPeriod)
  const addReadingTimeSlot = useBookStore((s) => s.addReadingTimeSlot)
  const removeReadingTimeSlot = useBookStore((s) => s.removeReadingTimeSlot)
  const recomputeAllBookStatuses = useBookStore((s) => s.recomputeAllBookStatuses)
  const getActiveEveningSummary = useBookStore((s) => s.getActiveEveningSummary)
  const markSummaryAsRead = useBookStore((s) => s.markSummaryAsRead)
  const updateQuietModeState = useBookStore((s) => s.updateQuietModeState)

  const { isInQuietMode } = useUpdateChecker()

  const activeSummary = getActiveEveningSummary()

  useEffect(() => {
    recomputeAllBookStatuses()
    updateQuietModeState()
  }, [recomputeAllBookStatuses, updateQuietModeState])

  const [showAddQuiet, setShowAddQuiet] = useState(false)
  const [newQuietName, setNewQuietName] = useState('')
  const [newQuietStart, setNewQuietStart] = useState('09:00')
  const [newQuietEnd, setNewQuietEnd] = useState('17:00')

  const [showAddSlot, setShowAddSlot] = useState(false)
  const [newSlotStart, setNewSlotStart] = useState('21:00')
  const [newSlotEnd, setNewSlotEnd] = useState('23:00')

  const [showDataSection, setShowDataSection] = useState(false)

  const handleAddQuietPeriod = () => {
    if (!newQuietName.trim()) return
    addQuietPeriod({
      name: newQuietName.trim(),
      start: newQuietStart,
      end: newQuietEnd,
      enabled: true,
    })
    setNewQuietName('')
    setShowAddQuiet(false)
  }

  const handleAddTimeSlot = () => {
    addReadingTimeSlot({ start: newSlotStart, end: newSlotEnd })
    setShowAddSlot(false)
  }

  const handleExport = () => {
    const data = {
      books: useBookStore.getState().books,
      updateRecords: useBookStore.getState().updateRecords,
      settings: useBookStore.getState().settings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookshelf-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (data.books) {
            localStorage.setItem('bookshelf-storage', JSON.stringify({ state: data }))
            window.location.reload()
          }
        } catch {
          alert('导入失败：文件格式不正确')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleClearAll = () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      localStorage.removeItem('bookshelf-storage')
      window.location.reload()
    }
  }

  return (
    <div className="flex h-full flex-col bg-parchment-100">
      <header className="shrink-0 bg-ink-900 px-4 pb-4 pt-safe">
        <div className="py-3">
          <h1 className="font-serif text-xl font-bold text-parchment-50">设置</h1>
          <p className="mt-0.5 text-xs text-ink-500">安静模式、阅读时段、提醒偏好</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
        {activeSummary && (
          <div className="pt-3">
            <EveningSummaryBanner
              key={activeSummary.id}
              summary={activeSummary}
              onDismiss={() => markSummaryAsRead(activeSummary.id)}
            />
          </div>
        )}

        <div className={activeSummary ? 'mt-0' : 'mt-4'}>
          <QuietModeBanner />
        </div>

        <section className={activeSummary ? 'mt-3' : 'mt-4'}>
          <div className="flex items-center gap-2 mb-3">
            <Moon className="h-4 w-4 text-ink-600" />
            <h2 className="text-sm font-semibold text-ink-900">安静模式</h2>
            <span className="text-xs text-ink-500">提醒合并为晚间清单</span>
          </div>

          <div className="space-y-2">
            {settings.quietPeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <button
                  onClick={() =>
                    updateQuietPeriod(period.id, { enabled: !period.enabled })
                  }
                  className={`shrink-0 flex h-6 w-10 items-center rounded-full p-0.5 transition-colors ${
                    period.enabled ? 'bg-ink-900' : 'bg-parchment-200'
                  }`}
                >
                  <motion.div
                    layout
                    className="h-5 w-5 rounded-full bg-white shadow-sm"
                    animate={{ x: period.enabled ? 16 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{period.name}</p>
                  <p className="text-xs text-ink-500 font-mono">
                    {period.start} - {period.end}
                  </p>
                </div>
                <button
                  onClick={() => removeQuietPeriod(period.id)}
                  className="shrink-0 text-parchment-300 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <AnimatePresence>
              {showAddQuiet && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-xl bg-white shadow-sm"
                >
                  <div className="px-4 py-3 space-y-3">
                    <input
                      value={newQuietName}
                      onChange={(e) => setNewQuietName(e.target.value)}
                      placeholder="时段名称，如「上课时间」"
                      className="w-full rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2 text-sm text-ink-900 placeholder:text-parchment-300 focus:border-ink-600 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={newQuietStart}
                        onChange={(e) => setNewQuietStart(e.target.value)}
                        className="flex-1 rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2 text-sm font-mono text-ink-900 focus:border-ink-600 focus:outline-none"
                      />
                      <span className="text-xs text-ink-500">至</span>
                      <input
                        type="time"
                        value={newQuietEnd}
                        onChange={(e) => setNewQuietEnd(e.target.value)}
                        className="flex-1 rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2 text-sm font-mono text-ink-900 focus:border-ink-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddQuiet(false)}
                        className="flex-1 rounded-lg bg-parchment-100 py-2 text-xs font-medium text-ink-600"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddQuietPeriod}
                        disabled={!newQuietName.trim()}
                        className="flex-1 rounded-lg bg-ink-900 py-2 text-xs font-medium text-white disabled:opacity-40"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showAddQuiet && (
              <button
                onClick={() => setShowAddQuiet(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-parchment-300 py-2.5 text-xs text-ink-500 transition-colors hover:border-ink-600 hover:text-ink-900"
              >
                <Plus className="h-3.5 w-3.5" />
                添加安静时段
              </button>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-ink-600" />
            <h2 className="text-sm font-semibold text-ink-900">常用阅读时段</h2>
          </div>

          <div className="space-y-2">
            {settings.readingTimeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <span className="font-mono text-sm text-ink-900">
                  {slot.start} - {slot.end}
                </span>
                <button
                  onClick={() => removeReadingTimeSlot(idx)}
                  className="text-parchment-300 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <AnimatePresence>
              {showAddSlot && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-xl bg-white shadow-sm"
                >
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={newSlotStart}
                        onChange={(e) => setNewSlotStart(e.target.value)}
                        className="flex-1 rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2 text-sm font-mono text-ink-900 focus:border-ink-600 focus:outline-none"
                      />
                      <span className="text-xs text-ink-500">至</span>
                      <input
                        type="time"
                        value={newSlotEnd}
                        onChange={(e) => setNewSlotEnd(e.target.value)}
                        className="flex-1 rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2 text-sm font-mono text-ink-900 focus:border-ink-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddSlot(false)}
                        className="flex-1 rounded-lg bg-parchment-100 py-2 text-xs font-medium text-ink-600"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddTimeSlot}
                        className="flex-1 rounded-lg bg-ink-900 py-2 text-xs font-medium text-white"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showAddSlot && (
              <button
                onClick={() => setShowAddSlot(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-parchment-300 py-2.5 text-xs text-ink-500 transition-colors hover:border-ink-600 hover:text-ink-900"
              >
                <Plus className="h-3.5 w-3.5" />
                添加阅读时段
              </button>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-ink-600" />
            <h2 className="text-sm font-semibold text-ink-900">提醒偏好</h2>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                {settings.notificationsEnabled ? (
                  <Bell className="h-4 w-4 text-ink-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-ink-400" />
                )}
                <span className="text-sm text-ink-900">提醒通知</span>
              </div>
              <button
                onClick={() =>
                  updateSettings({ notificationsEnabled: !settings.notificationsEnabled })
                }
                className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors ${
                  settings.notificationsEnabled ? 'bg-ink-900' : 'bg-parchment-200'
                }`}
              >
                <motion.div
                  layout
                  className="h-5 w-5 rounded-full bg-white shadow-sm"
                  animate={{ x: settings.notificationsEnabled ? 16 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-ink-600" />
                ) : (
                  <VolumeX className="h-4 w-4 text-ink-400" />
                )}
                <span className="text-sm text-ink-900">提醒声音</span>
              </div>
              <button
                onClick={() =>
                  updateSettings({ soundEnabled: !settings.soundEnabled })
                }
                className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors ${
                  settings.soundEnabled ? 'bg-ink-900' : 'bg-parchment-200'
                }`}
              >
                <motion.div
                  layout
                  className="h-5 w-5 rounded-full bg-white shadow-sm"
                  animate={{ x: settings.soundEnabled ? 16 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <Vibrate className="h-4 w-4 text-ink-600" />
                <span className="text-sm text-ink-900">震动</span>
              </div>
              <button
                onClick={() =>
                  updateSettings({ vibrationEnabled: !settings.vibrationEnabled })
                }
                className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors ${
                  settings.vibrationEnabled ? 'bg-ink-900' : 'bg-parchment-200'
                }`}
              >
                <motion.div
                  layout
                  className="h-5 w-5 rounded-full bg-white shadow-sm"
                  animate={{ x: settings.vibrationEnabled ? 16 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <button
            onClick={() => setShowDataSection(!showDataSection)}
            className="flex w-full items-center justify-between mb-3"
          >
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-ink-600" />
              <h2 className="text-sm font-semibold text-ink-900">数据管理</h2>
            </div>
            {showDataSection ? (
              <ChevronUp className="h-4 w-4 text-ink-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-500" />
            )}
          </button>

          <AnimatePresence>
            {showDataSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2"
              >
                <button
                  onClick={handleExport}
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition-colors hover:bg-parchment-50"
                >
                  <Download className="h-4 w-4 text-ink-600" />
                  <div className="text-left">
                    <p className="text-sm text-ink-900">导出数据</p>
                    <p className="text-xs text-ink-500">保存书架为 JSON 文件</p>
                  </div>
                </button>

                <button
                  onClick={handleImport}
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition-colors hover:bg-parchment-50"
                >
                  <Upload className="h-4 w-4 text-ink-600" />
                  <div className="text-left">
                    <p className="text-sm text-ink-900">导入数据</p>
                    <p className="text-xs text-ink-500">从 JSON 文件恢复书架</p>
                  </div>
                </button>

                <button
                  onClick={handleClearAll}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 transition-colors hover:bg-red-50"
                >
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div className="text-left">
                    <p className="text-sm text-red-600">清除所有数据</p>
                    <p className="text-xs text-red-400">此操作不可恢复</p>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  )
}
