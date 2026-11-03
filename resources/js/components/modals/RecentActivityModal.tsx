import React from 'react'
import { createPortal } from 'react-dom'
import { X, Activity, LogIn, Edit, Shield, User, Clock, Calendar } from 'lucide-react'
import { formatDate } from '../../utils/format'

interface RecentActivityModalProps {
  isOpen: boolean
  onClose: () => void
}

// Mock data - replace with API calls
const MOCK_ACTIVITIES = [
  { id: 1, action: 'Logged in successfully', ip_address: '192.168.1.105', created_at: new Date().toISOString(), icon: LogIn },
  { id: 2, action: 'Updated profile information', ip_address: '192.168.1.105', created_at: new Date(Date.now() - 3600000).toISOString(), icon: Edit },
  { id: 3, action: 'Changed account password', ip_address: '192.168.1.105', created_at: new Date(Date.now() - 86400000).toISOString(), icon: Shield },
  { id: 4, action: 'Logged in successfully', ip_address: '192.168.1.105', created_at: new Date(Date.now() - 172800000).toISOString(), icon: LogIn },
]

export default function RecentActivityModal({ isOpen, onClose }: RecentActivityModalProps) {
  if (!isOpen) return null

  const modalContent = (
    <div className="fixed top-0 right-0 bottom-0 left-0 md:left-64 z-[9999] bg-white overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start sticky top-0 z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Recent Activity</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">Review your recent logins and account changes.</p>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors mt-0.5"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 bg-white">
        {MOCK_ACTIVITIES.map((activity) => {
          const Icon = activity.icon
          return (
            <div key={activity.id} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-md shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                <p className="text-sm font-semibold text-slate-800">{activity.action}</p>
                <div className="flex items-center gap-3 text-[12px] text-slate-500 font-medium">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                    IP: {activity.ip_address}
                  </span>
                  <span>{formatDate(activity.created_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}