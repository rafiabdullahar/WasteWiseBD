import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Send,
  Clock,
  Pencil,
  Trash2,
  X,
  Paperclip,
  MapPin,
  CalendarDays,
  ListChecks,
} from 'lucide-react'

const CATEGORIES = [
  "Missed Pickup",
  "Partial Collection",
  "Wrong Waste Handling",
  "Bin Overflow",
  "Other",
]

const STATUS_STYLES = {
  Open: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
  Investigating: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
  Resolved: 'bg-green-950/40 text-green-400 border-green-900/50',
  Closed: 'bg-gray-800 text-gray-400 border-gray-700',
}

const emptyForm = { category: '', description: '', area: '', missedDate: '' }

const ResidentComplaintPage = () => {
  const [form, setForm] = useState(emptyForm)
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)

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

  const resetForm = () => {
    setForm(emptyForm)
    setEvidenceFile(null)
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.category) {
      toast.error('Please select an issue type')
      return
    }
    if (form.category === 'Other' && !form.description.trim()) {
      toast.error('Please describe the issue when selecting "Other"')
      return
    }
    if (!form.area.trim()) {
      toast.error('Please enter the area')
      return
    }
    if (!form.missedDate) {
      toast.error('Please select the missed date')
      return
    }

    setSubmitting(true)
    try {
      let data
      if (editingId) {
        const res = await api.put(`/complaints/${editingId}`, form)
        data = res.data
      } else {
        const formData = new FormData()
        formData.append('category', form.category)
        formData.append('description', form.description)
        formData.append('area', form.area)
        formData.append('missedDate', form.missedDate)
        if (evidenceFile) formData.append('evidence', evidenceFile)

        const res = await api.post('/complaints', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        data = res.data
      }

      if (data.success) {
        toast.success(editingId ? 'Complaint updated' : 'Complaint submitted')
        resetForm()
        fetchComplaints()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save complaint')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (c) => {
    setEditingId(c._id)
    setForm({
      category: c.category,
      description: c.description || '',
      area: c.area || '',
      missedDate: c.missedDate ? c.missedDate.slice(0, 10) : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this complaint?')) return
    try {
      const { data } = await api.delete(`/complaints/${id}`)
      if (data.success) {
        toast.success('Complaint deleted')
        setComplaints((prev) => prev.filter((c) => c._id !== id))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete complaint')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Missed Collection Complaint</h1>
        <p className="text-gray-400">Report a missed pickup and track its resolution.</p>
      </div>

      <div className="card-glass border border-brand-900/40">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-brand-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? 'Edit Complaint' : 'Report an Issue'}
            </h2>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-gray-500 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="pt-5 space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <ListChecks className="w-4 h-4 text-gray-500" />
              Issue type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
              className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="">Select an issue type</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                required
                placeholder="e.g. Gulshan-2"
                className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <CalendarDays className="w-4 h-4 text-gray-500" />
                Missed date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.missedDate}
                onChange={(e) => setForm({ ...form, missedDate: e.target.value })}
                required
                className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description {form.category === 'Other' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder={form.category === 'Other' ? 'Please describe the issue' : 'Additional details (optional)'}
              className="w-full rounded-xl bg-gray-800 border border-gray-700 p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          {!editingId && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Paperclip className="w-4 h-4 text-gray-500" />
                Photo evidence (optional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setEvidenceFile(e.target.files[0])}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Saving...' : editingId ? 'Update Complaint' : 'Submit Complaint'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Your Complaints</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : complaints.length === 0 ? (
          <div className="card-glass text-center py-10">
            <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">You haven't filed any complaints yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c._id} className="card-glass">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white font-medium">{c.category}</p>
                    {c.description && <p className="text-gray-300 text-sm mt-1">{c.description}</p>}
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {c.area}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {c.missedDate && new Date(c.missedDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Filed {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {c.evidenceUrl && (
                  <a
                    href={`http://localhost:5001${c.evidenceUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline mt-3"
                  >
                    <Paperclip className="w-3 h-3" />
                    View attached photo
                  </a>
                )}

                {c.status === 'Open' && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-800">
                    <button onClick={() => handleEdit(c)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 hover:bg-gray-800 rounded-lg">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button onClick={() => handleDelete(c._id)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 px-3 py-1.5 hover:bg-red-950/30 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResidentComplaintPage