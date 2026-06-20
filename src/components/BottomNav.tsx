import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const tabs = [
    { path: '/', icon: BookOpen, label: '书架' },
    { path: '/settings', icon: Settings, label: '设置' },
  ]

  return (
    <nav className="absolute bottom-0 inset-x-0 z-30 border-t border-parchment-200 bg-white/95 backdrop-blur-sm">
      <div className="flex items-center justify-around py-2 pb-safe">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 px-6 py-1"
            >
              <div className="relative">
                <tab.icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? 'text-amber-accent' : 'text-ink-500'
                  }`}
                />
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-accent"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-amber-accent' : 'text-ink-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
