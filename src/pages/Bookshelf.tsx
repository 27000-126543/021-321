import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Search, Plus, BookOpen, ArrowUpDown, Sparkles, Bell } from 'lucide-react'
import { useBookStore } from '@/store/useBookStore'
import { useUpdateChecker } from '@/hooks/useUpdateChecker'
import BookCard from '@/components/BookCard'
import AddBookSheet from '@/components/AddBookSheet'
import EveningSummaryBanner from '@/components/EveningSummaryBanner'
import QuietModeBanner from '@/components/QuietModeBanner'
import CheckingIndicator from '@/components/CheckingIndicator'
import type { SortOption } from '@/types'

export default function Bookshelf() {
  const navigate = useNavigate()
  const books = useBookStore((s) => s.books)
  const simulateUpdate = useBookStore((s) => s.simulateUpdate)
  const recomputeAllBookStatuses = useBookStore((s) => s.recomputeAllBookStatuses)
  const getActiveEveningSummary = useBookStore((s) => s.getActiveEveningSummary)
  const markSummaryAsRead = useBookStore((s) => s.markSummaryAsRead)
  const clearCheckedStatus = useBookStore((s) => s.clearCheckedStatus)
  const getUnreadNotificationCount = useBookStore((s) => s.getUnreadNotificationCount)

  const { triggerCheck, isChecking, isInQuietMode } = useUpdateChecker()

  const [search, setSearch] = useState('')
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('updateTime')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const activeSummary = getActiveEveningSummary()
  const unreadNotifCount = getUnreadNotificationCount()

  useEffect(() => {
    recomputeAllBookStatuses()
  }, [recomputeAllBookStatuses])

  const filteredBooks = useMemo(() => {
    let result = books.filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase())
    )

    switch (sortBy) {
      case 'updateTime':
        result.sort((a, b) => new Date(b.lastUpdateTime).getTime() - new Date(a.lastUpdateTime).getTime())
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title, 'zh'))
        break
      case 'status':
        const statusOrder = { pending: 0, burst: 1, discontinued: 2, normal: 3 }
        result.sort((a, b) => {
          const aOrder = a.checkedWithNewChapter ? -1 : statusOrder[a.status]
          const bOrder = b.checkedWithNewChapter ? -1 : statusOrder[b.status]
          return aOrder - bOrder
        })
        break
    }

    return result
  }, [books, search, sortBy])

  const pendingCount = books.filter((b) => (b.status === 'pending' || b.status === 'burst') && !b.isPaused).length

  const sortLabels: Record<SortOption, string> = {
    updateTime: '更新时间',
    title: '书名',
    status: '状态',
  }

  const handleManualCheck = async () => {
    await triggerCheck(false)
  }

  const handleSimulateAll = () => {
    books.forEach((b) => {
      if (!b.isPaused && Math.random() > 0.5) {
        simulateUpdate(b.id)
      }
    })
    recomputeAllBookStatuses()
  }

  const handleClearChecked = () => {
    clearCheckedStatus()
  }

  const handleSummaryDismiss = () => {
    if (activeSummary) {
      markSummaryAsRead(activeSummary.id)
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-parchment-100">
      <header className="shrink-0 bg-ink-900 px-4 pb-3 pt-safe">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-parchment-50">追更书架</h1>
            <p className="mt-0.5 text-xs text-ink-500">
              {books.length > 0
                ? `共${books.length}本在追${pendingCount > 0 ? `，${pendingCount}本待补读` : ''}`
                : '添加你正在追的网文'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-parchment-50 transition-colors hover:bg-ink-600"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-accent px-1 text-[9px] font-bold text-white">
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>
            {books.length > 0 && (
              <button
                onClick={handleClearChecked}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-ink-500 transition-colors hover:text-parchment-50"
                title="清除检查状态"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={handleSimulateAll}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                isInQuietMode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-ink-700 text-amber-accent hover:bg-ink-600'
              }`}
              title={isInQuietMode ? '模拟更新（安静模式）' : '模拟更新'}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索书名或作者"
            className="w-full rounded-xl bg-ink-800 py-2.5 pl-9 pr-3 text-sm text-parchment-50 placeholder:text-ink-500 focus:outline-none focus:ring-1 focus:ring-ink-600"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3 scrollbar-hide">
        <AnimatePresence>
          {activeSummary && (
            <EveningSummaryBanner
              key={activeSummary.id}
              summary={activeSummary}
              onDismiss={handleSummaryDismiss}
            />
          )}
        </AnimatePresence>

        <QuietModeBanner />

        <CheckingIndicator onManualCheck={handleManualCheck} />

        <div className="shrink-0 flex items-center justify-between py-2">
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 text-xs text-ink-600 transition-colors hover:text-ink-900"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortLabels[sortBy]}
            </button>
            {showSortMenu && (
              <div className="absolute left-0 top-full z-20 mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-parchment-200">
                {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortBy(key)
                      setShowSortMenu(false)
                    }}
                    className={`block w-full px-4 py-2 text-left text-xs transition-colors ${
                      sortBy === key
                        ? 'bg-ink-900 text-white'
                        : 'text-ink-600 hover:bg-parchment-50'
                    }`}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-ink-500">{filteredBooks.length}本</span>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredBooks.map((book) => (
            <div key={book.id} className="mb-3">
              <BookCard book={book} />
            </div>
          ))}
        </AnimatePresence>

        {filteredBooks.length === 0 && books.length > 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-500">没有找到匹配的书籍</p>
          </div>
        )}

        {books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-parchment-200">
              <BookOpen className="h-8 w-8 text-ink-500" />
            </div>
            <h3 className="mt-4 font-serif text-base font-semibold text-ink-900">书架空空如也</h3>
            <p className="mt-1 text-sm text-ink-500">点击右下角按钮添加第一本追更</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowAddSheet(true)}
        className="absolute bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-amber-accent text-white shadow-lg shadow-amber-accent/30 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddBookSheet open={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  )
}
