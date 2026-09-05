import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { AlertTriangle, MapPin, CalendarDays, Clock, Paperclip } from 'lucide-react'

const STATUSES = ['Open', 'Investigating', 'Resolved', 'Closed']

const STATUS_STYLES = {
  Open: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
  Investigating: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
  Resolved: 'bg-green-950/40 text-green-400 border-green-900/50',
  Closed: 'bg-gray-800 text-gray-400 border-gray-700',
}

const AdminComplaintsPage = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')

  const fetchComplaints = async () => {
    try {
      const { data } = await api.get('/complaints')
      if (data.success) setComplaints(data.data.complaints)
    } catch {
      toast.error('Could not load complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  const handleStatusChange = async (id, status) => {
    try {
      const { data } = await api.patch(`/complaints/${id}/status`, { status })
      if (data.success) {
        toast.success('Status updated')
        setComplaints((prev) => prev.map((c) => (c._id === id ? data.data.complaint : c)))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const counts = useMemo(() => {
    const result = { All: complaints.length, Open: 0, Investigating: 0, Resolved: 0, Closed: 0 }
    complaints.forEach((c) => { result[c.status] = (result[c.status] || 0) + 1 })
    return result
  }, [complaints])

  const filtered = useMemo(() => {
    return complaints.filter((c) => activeFilter === 'All' || c.status === activeFilter)
  }, [complaints, activeFilter])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-600/10 rounded-xl flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-brand-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Complaints</h1>
          <p className="text-gray-400">Review and resolve resident complaints.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['All', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="card-glass text-center py-10">
          <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No complaints match this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c._id} className="card-glass">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-white font-medium">{c.resident?.name}</p>
                  <p className="text-xs text-gray-500">{c.resident?.email}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Filed on {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[c.status]}`}>
                  {c.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-brand-500 bg-brand-600/10 px-2.5 py-1 rounded-lg">
                  {c.category}
                </span>
              </div>

              {c.description && (
                <p className="text-gray-300 text-sm mb-3">{c.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {c.area || '—'}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Missed on {c.missedDate ? new Date(c.missedDate).toLocaleDateString() : '—'}
                </span>
              </div>

              {c.evidenceUrl && (
                <a
                  href={`http://localhost:5001${c.evidenceUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline mb-3"
                >
                  <Paperclip className="w-3 h-3" />
                  View attached photo
                </a>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                <label className="text-xs text-gray-500">Update status:</label>
                <select
                  value={c.status}
                  onChange={(e) => handleStatusChange(c._id, e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminComplaintsPage