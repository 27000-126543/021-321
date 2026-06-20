import { STATUS_CONFIG } from '@/types'
import type { Book } from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: Book['status']
  isPaused?: boolean
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, isPaused, size = 'sm' }: StatusBadgeProps) {
  if (isPaused) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-medium',
          'bg-gray-50 text-gray-500 border-gray-200',
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        )}
      >
        已暂停
      </span>
    )
  }

  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bg,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <span
        className="mr-1 inline-block rounded-full"
        style={{
          backgroundColor: config.color,
          width: size === 'sm' ? 6 : 8,
          height: size === 'sm' ? 6 : 8,
        }}
      />
      {config.label}
    </span>
  )
}
