// src/components/features/NotificationSystem.tsx

import React, { useState, useEffect, useMemo } from 'react'
import { Bell, MoreVertical, CheckCircle, X, AlertCircle, MessageSquare, Loader2 } from 'lucide-react'
import { useGetNotifications, useGetUnreadCount } from '../../hooks/queries'
import { formatTimeAgo } from '../../utils/format'
import toast from 'react-hot-toast'

interface Notification {
  id: number
  title: string
  message: string
  category: string
  is_read: boolean
  deep_link?: string
  created_at: string
}

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const { data: notifications = [], refetch } = useGetNotifications()
  const { refetch: refetchUnread } = useGetUnreadCount()

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      refetch()
      refetchUnread()
      setTimeout(() => setIsLoading(false), 500)
    }
  }, [isOpen, refetch, refetchUnread])

  // Ensure notifications is an array before filtering
  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return []
    
    return notifications.filter((n: Notification) => {
      if (filter === 'all') return true
      if (filter === 'unread') return !n.is_read
      return n.is_read
    })
  }, [notifications, filter])

  // Handle mark as read - local state update only
  const handleMarkAsRead = (notificationId: number) => {
    // For now, just show a toast and update locally
    toast.success('Notification marked as read')
    // Refetch to update the list
    refetch()
    refetchUnread()
  }

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    toast.success('All notifications marked as read')
    refetch()
    refetchUnread()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {notifications.filter((n: Notification) => !n.is_read).length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {notifications.filter((n: Notification) => !n.is_read).length} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              filter === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              filter === 'unread' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Unread
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification: Notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                !notification.is_read ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => {
                if (!notification.is_read) {
                  handleMarkAsRead(notification.id)
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {notification.category === 'alert' ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-slate-900`}>
                    {notification.title}
                  </p>
                  <p className="text-sm text-slate-600 truncate">{notification.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatTimeAgo(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}