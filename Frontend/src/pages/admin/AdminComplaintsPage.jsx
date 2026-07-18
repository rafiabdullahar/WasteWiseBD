import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { AlertCircle } from 'lucide-react'

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Complaints</h1>
        <p className="text-gray-400">Review and resolve resident complaints.</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : complaints.length === 0 ? (
        <div className="card-glass text-center py-10">
          <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No complaints have been filed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c._id} className="card-glass">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-white font-medium">{c.resident?.name}</p>
                  <p className="text-xs text-gray-500">{c.resident?.email}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-4">{c.description}</p>
              {c.pickupContext && (
  <p className="text-xs text-gray-500 mb-4">
    📍 {c.pickupContext}
  </p>
)}
              <div className="flex items-center gap-2">
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