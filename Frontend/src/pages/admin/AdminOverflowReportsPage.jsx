// Frontend/src/pages/admin/AdminOverflowReportsPage.jsx

import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  Trash2,
  MapPin,
  Clock,
  Truck,
  CheckCircle2,
  X,
  ArrowRight,
  Calendar,
} from 'lucide-react'

const STATUSES = ['Pending', 'In Progress', 'Resolved']

const STATUS_ICON = {
  Pending: Clock,
  'In Progress': Truck,
  Resolved: CheckCircle2,
}

const STATUS_STYLES = {
  Pending: 'bg-yellow-950/60 text-yellow-400 border-yellow-900/50',
  'In Progress': 'bg-blue-950/60 text-blue-400 border-blue-900/50',
  Resolved: 'bg-brand-950/60 text-brand-400 border-brand-900/50',
}

const NEXT_STATUS = {
  Pending: 'In Progress',
  'In Progress': 'Resolved',
}

const AdminOverflowReportsPage = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('Pending')
  const [lightbox, setLightbox] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const fetchReports = async () => {
    try {
      const { data } = await api.get('/overflow-reports')
      if (data.success) setReports(data.data.reports)
    } catch {
      toast.error('Could not load overflow reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const counts = useMemo(() => {
    const result = { All: reports.length, Pending: 0, 'In Progress': 0, Resolved: 0 }
    reports.forEach((r) => { result[r.status] = (result[r.status] || 0) + 1 })
    return result
  }, [reports])

  const filtered = useMemo(() => {
    return reports.filter((r) => activeFilter === 'All' || r.status === activeFilter)
  }, [reports, activeFilter])

  const advanceStatus = async (report) => {
    const nextStatus = NEXT_STATUS[report.status]
    if (!nextStatus) return

    setUpdatingId(report._id)
    try {
      const { data } = await api.patch(`/overflow-reports/${report._id}/status`, {
        status: nextStatus,
      })
      if (data.success) {
        toast.success(`Marked as ${nextStatus}`)
        setReports((prev) => prev.map((r) => (r._id === report._id ? data.data.report : r)))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-600/10 rounded-xl flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5 text-brand-500" />
        </div>
        <div>
          <h1 className="page-title">Public Bin Reports</h1>
          <p className="page-subtitle">Review resident-reported overflowing bins and track cleanup.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['All', ...STATUSES].map((s) => {
          const Icon = STATUS_ICON[s]
          return (
            <button
              key={s}
              onClick={() => setActiveFilter(s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                activeFilter === s
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {s}
              <span className={activeFilter === s ? 'text-brand-100' : 'text-gray-600'}>
                {counts[s] || 0}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="card-glass text-center py-14">
          <Trash2 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No reports in this view.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const nextStatus = NEXT_STATUS[r.status]
            return (
              <div
                key={r._id}
                className="group rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors flex flex-col"
              >
                <div
                  className="relative aspect-[4/3] cursor-pointer overflow-hidden"
                  onClick={() => setLightbox(r)}
                >
                  <img
                    src={r.photoUrl}
                    alt={r.locationDescription}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0" />
                  <span
                    className={`absolute top-3 left-3 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border backdrop-blur-sm ${STATUS_STYLES[r.status]}`}
                  >
                    {(() => {
                      const Icon = STATUS_ICON[r.status]
                      return <Icon className="w-3 h-3" />
                    })()}
                    {r.status}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium truncate">
                      {r.locationDescription}
                    </p>
                    <p className="text-gray-300 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {r.area?.name || 'Unknown area'}
                    </p>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{r.resident?.name}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {r.description && (
                    <p className="text-gray-400 text-xs mb-3 truncate">{r.description}</p>
                  )}

                  <div className="mt-auto">
                    {nextStatus ? (
                      <button
                        onClick={() => advanceStatus(r)}
                        disabled={updatingId === r._id}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {updatingId === r._id ? 'Updating...' : `Mark ${nextStatus}`}
                        {updatingId !== r._id && <ArrowRight className="w-3 h-3" />}
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-brand-500 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolved
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox for full-size photo */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightbox.photoUrl}
            alt={lightbox.locationDescription}
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default AdminOverflowReportsPage