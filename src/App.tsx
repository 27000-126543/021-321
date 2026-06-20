import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Bookshelf from '@/pages/Bookshelf'
import ReminderDetail from '@/pages/ReminderDetail'
import Settings from '@/pages/Settings'
import BottomNav from '@/components/BottomNav'

function AppLayout() {
  const location = useLocation()
  const showNav = location.pathname === '/' || location.pathname === '/settings'

  return (
    <div className="mx-auto h-full max-w-[480px] bg-parchment-100 shadow-2xl relative">
      <Routes>
        <Route path="/" element={<Bookshelf />} />
        <Route path="/reminder/:bookId" element={<ReminderDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}
