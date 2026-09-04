import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, BellDot, Check, CheckCheck, Trash2, X, Loader2 } from 'lucide-react'
import api from '../services/api'

const TYPE_ICONS = {
  pickup_assigned:    '🚛',
  pickup_on_way:      '🛣️',
  pickup_completed:   '✅',
  pickup_failed:      '❌',
  recycling_accepted: '♻️',
  recycling_rejected: '🚫',
  recycling_completed:'✅',
  complaint_updated:  '📋',
  reward_earned:      '🏆',
  reminder:           '🔔',
  partner_verified:   '🛡️',
  system:             '💬',
}

const NotificationPanel = () => {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const panelRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/notifications?limit=30')
      setNotifications(data.data.notifications)
      setUnreadCount(data.data.unreadCount)
    } catch {
      // silently fail — don't disrupt the UI for a notification fetch error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Poll for new notifications every 60 seconds while the component is mounted.
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close panel when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleToggle = () => {
    setOpen((prev) => !prev)
    if (!open) fetchNotifications()
  }

  const handleMarkRead = async (id, e) => {
    e.stopPropagation()
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* silent */ }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/notifications/${id}`)
      const deleted = notifications.find((n) => n._id === id)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      if (deleted && !deleted.isRead) setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* silent */ }
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellDot className="w-5 h-5 text-brand-400" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:left-0 bottom-20 sm:bottom-full sm:mb-2 w-auto sm:w-96 max-w-[calc(100vw-24px)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 z-50 flex flex-col overflow-hidden animate-slide-up">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="btn-ghost text-xs gap-1 text-gray-400 hover:text-brand-400 px-2 py-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="btn-ghost p-1 text-gray-500 hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[420px]">
            {isLoading && notifications.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bell className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-800/60 last:border-0 transition-colors duration-150 ${
                    !n.isRead ? 'bg-brand-950/30 hover:bg-brand-950/50' : 'hover:bg-gray-800/40'
                  }`}
                >
                  {/* Icon */}
                  <span className="text-lg shrink-0 mt-0.5" role="img" aria-hidden>
                    {TYPE_ICONS[n.type] || '💬'}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.isRead ? 'text-white font-medium' : 'text-gray-300'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-1">{formatTime(n.createdAt)}</p>
                  </div>

                  {/* Unread dot + actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-400 mt-1" />
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.isRead && (
                        <button
                          onClick={(e) => handleMarkRead(n._id, e)}
                          title="Mark as read"
                          className="p-1 rounded-md text-gray-500 hover:text-brand-400 hover:bg-brand-950/50 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(n._id, e)}
                        title="Delete"
                        className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-950/50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-800 text-center">
              <p className="text-xs text-gray-600">Showing last {notifications.length} notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationPanel
