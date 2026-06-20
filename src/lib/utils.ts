import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 30) return `${diffDays}天前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
  return `${Math.floor(diffDays / 365)}年前`
}

export function formatWordCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万字`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}千字`
  return `${count}字`
}

export function formatChapter(current: number, latest: number): string {
  if (current === latest) return `第${latest}章（已读完）`
  return `读到第${current}章 / 最新第${latest}章`
}

export function getScheduleLabel(type: string, time: string, days?: number[], customNote?: string): string {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  switch (type) {
    case 'daily':
      return `每日 ${time}`
    case 'weekly':
      if (days && days.length > 0) {
        const dayStr = days.map((d) => `周${dayNames[d]}`).join('、')
        return `${dayStr} ${time}`
      }
      return `每周 ${time}`
    case 'custom':
      return customNote || `自定义 ${time}`
    default:
      return time
  }
}
