import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { AlertCircle, Send, Clock } from 'lucide-react'

const STATUS_STYLES = {
  Open: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
  Investigating: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
  Resolved: 'bg-green-950/40 text-green-400 border-green-900/50',
  Closed: 'bg-gray-800 text-gray-400 border-gray-700',
}

const ResidentComplaintPage = () => {
  const [description, setDescription] = useState('')
  const [pickupContext, setPickupContext] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchComplaints = async () => {
    try {
      const { data } = await api.get('/complaints/my')
      if (data.success) setComplaints(data.data.complaints)
    } catch {
      toast.error('Could not load your complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) {
      toast.error('Please describe the issue')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post('/complaints', { description, pickupContext })
      if (data.success) {
        toast.success('Complaint submitted')
        setDescription('')
        setPickupContext('')
        fetchComplaints()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Missed Collection Complaint</h1>
        <p className="text-gray-400">Report a missed pickup and track its resolution.</p>
      </div>

      <form onSubmit={handleSubmit} className="card-glass space-y-4">
        <label className="block text-sm font-medium text-gray-300">
          What happened?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="e.g. My waste was not collected on the scheduled date"
          className="w-full rounded-xl bg-gray-800 border border-gray-700 p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      <div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Area / date of missed pickup (optional)
  </label>
  <input
    type="text"
    value={pickupContext}
    onChange={(e) => setPickupContext(e.target.value)}
    placeholder="e.g. Gulshan-2, July 17th"
    className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
  />
</div>  
        <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
          <Send className="w-4 h-4" />
          {submitting ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Your Complaints</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : complaints.length === 0 ? (
          <div className="card-glass text-center py-10">
            <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">You haven't filed any complaints yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c._id} className="card-glass">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-gray-200 flex-1">{c.description}</p>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-3">
                  <Clock className="w-3 h-3" />
                  {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResidentComplaintPage