import { useEffect, useRef, useCallback } from 'react'
import { useBookStore } from '@/store/useBookStore'

export function useUpdateChecker() {
  const checkAllUpdates = useBookStore((s) => s.checkAllUpdates)
  const recomputeAllBookStatuses = useBookStore((s) => s.recomputeAllBookStatuses)
  const updateQuietModeState = useBookStore((s) => s.updateQuietModeState)
  const isInReadingTimeSlot = useBookStore((s) => s.isInReadingTimeSlot)
  const isChecking = useBookStore((s) => s.isChecking)
  const isInQuietMode = useBookStore((s) => s.isInQuietMode)

  const lastCheckedRef = useRef<number>(0)
  const lastStatusRecomputeRef = useRef<number>(0)
  const readingSlotActiveRef = useRef(false)

  const triggerCheck = useCallback(async (silent = false) => {
    const now = Date.now()
    if (isChecking && !silent) return

    if (!silent) {
      lastCheckedRef.current = now
    }

    await checkAllUpdates(silent)
  }, [checkAllUpdates, isChecking])

  useEffect(() => {
    recomputeAllBookStatuses()
    updateQuietModeState()
    lastStatusRecomputeRef.current = Date.now()
  }, [recomputeAllBookStatuses, updateQuietModeState])

  useEffect(() => {
    const interval = setInterval(() => {
      updateQuietModeState()

      const inSlot = isInReadingTimeSlot()
      const wasInSlot = readingSlotActiveRef.current

      if (inSlot && !wasInSlot) {
        const now = Date.now()
        if (now - lastCheckedRef.current > 5 * 60 * 1000) {
          triggerCheck(true)
        }
      }
      readingSlotActiveRef.current = inSlot

      const now = Date.now()
      if (now - lastStatusRecomputeRef.current > 30 * 60 * 1000) {
        recomputeAllBookStatuses()
        lastStatusRecomputeRef.current = now
      }
    }, 10 * 1000)

    return () => clearInterval(interval)
  }, [updateQuietModeState, isInReadingTimeSlot, triggerCheck, recomputeAllBookStatuses])

  return {
    triggerCheck,
    isChecking,
    isInQuietMode,
  }
}
