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
  MapPin,
  CalendarDays,
  ListChecks,
  MessageSquare,
  History,
  ChevronDown,
  ChevronUp,
  Package,
  AlertOctagon,
  HelpCircle,
  Truck,
  Check,
  User,
} from 'lucide-react'

const CATEGORIES = [
  "Missed Pickup",
  "Partial Collection",
  "Wrong Waste Handling",
  "Other",
]

const PICKUP_LINKED_CATEGORIES = [
  "Missed Pickup",
  "Partial Collection",
  "Wrong Waste Handling",
]

const STATUS_STYLES = {
  Open: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
  Investigating: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
  Resolved: 'bg-green-950/40 text-green-400 border-green-900/50',
  Closed: 'bg-gray-800 text-gray-400 border-gray-700',
}

const STATUS_BORDER = {
  Open: 'border-l-yellow-500',
  Investigating: 'border-l-blue-500',
  Resolved: 'border-l-brand-500',
  Closed: 'border-l-gray-600',
}

const STATUS_DOT = {
  Open: 'bg-yellow-500',
  Investigating: 'bg-blue-500',
  Resolved: 'bg-brand-500',
  Closed: 'bg-gray-500',
}

const CATEGORY_META = {
  'Missed Pickup': { icon: Clock, badge: 'badge-blue' },
  'Partial Collection': { icon: Package, badge: 'badge-blue' },
  'Wrong Waste Handling': { icon: AlertOctagon, badge: 'badge-red' },
  'Other': { icon: HelpCircle, badge: 'badge-gray' },
}

const PICKUP_STATUS_LABEL = {
  pending: 'Pending',
  assigned: 'Assigned',
  on_the_way: 'On the way',
  collected: 'Collected',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

const emptyForm = { category: '', description: '', addressId: '', pickupRequest: '', missedDate: '' }

const ResidentComplaintPage = () => {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [complaints, setComplaints] = useState([])
  const [addresses, setAddresses] = useState([])
  const [pickupRequests, setPickupRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [expandedHistory, setExpandedHistory] = useState({})

  const isPickupLinked = PICKUP_LINKED_CATEGORIES.includes(form.category)

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

  const fetchAddresses = async () => {
    try {
      const { data } = await api.get('/residents/addresses')
      if (data.success) setAddresses(data.data.addresses)
    } catch {
      toast.error('Could not load your saved addresses')
    }
  }

  const fetchPickupRequests = async () => {
    try {
      const { data } = await api.get('/residents/pickup-requests?limit=50')
      if (data.success) setPickupRequests(data.data.requests)
    } catch {
      toast.error('Could not load your pickup requests')
    }
  }

  useEffect(() => {
    fetchComplaints()
    fetchAddresses()
    fetchPickupRequests()
  }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleCategoryChange = (category) => {
    setForm((prev) => ({ ...prev, category, addressId: '', pickupRequest: '', missedDate: '' }))
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
    if (isPickupLinked && !form.pickupRequest) {
      toast.error('Please select the pickup this complaint is about')
      return
    }
    if (!isPickupLinked && !form.addressId) {
      toast.error('Please select an address')
      return
    }
    if (!form.missedDate) {
      toast.error('Please select the date')
      return
    }

    setSubmitting(true)
    try {
      let data
      if (editingId) {
        const res = await api.put(`/complaints/${editingId}`, form)
        data = res.data
        } else {
          const payload = {
            category: form.category,
            description: form.description,
            missedDate: form.missedDate,
            ...(isPickupLinked
              ? { pickupRequest: form.pickupRequest }
              : { addressId: form.addressId }),
          }

          const res = await api.post('/complaints', payload)
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
    if (!window.confirm('Edit this complaint?')) return
    setEditingId(c._id)
    setForm({
      category: c.category,
      description: c.description || '',
      addressId: c.addressId || '',
      pickupRequest: c.pickupRequest?._id || c.pickupRequest || '',
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
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
              className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="">Select an issue type</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {form.category && (
            <div className="animate-fade-in">
              {isPickupLinked ? (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <Truck className="w-4 h-4 text-gray-500" />
                    Which pickup is this about? <span className="text-red-500">*</span>
                  </label>

                  {(() => {
                    const eligiblePickups = pickupRequests.filter((p) => {
                      const isPastDue = new Date(p.preferredDate) < new Date()

                      if (form.category === 'Missed Pickup') {
                        return p.status !== 'collected' && p.status !== 'cancelled' && isPastDue
                      }

                      return p.status === 'collected'
                    })
                    if (eligiblePickups.length === 0) {
                      return (
                        <div className="p-3 rounded-xl bg-yellow-950/30 border border-yellow-900/40 text-yellow-400 text-sm">
                          You don't have any past pickups to report an issue about yet.
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {eligiblePickups.map((p) => {
                          const isSelected = form.pickupRequest === p._id
                          const itemsLabel = p.wasteItems?.map((w) => w.category).join(', ') || 'items'

                          return (
                            <button
                              type="button"
                              key={p._id}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  pickupRequest: p._id,
                                  missedDate: p.preferredDate.slice(0, 10),
                                })
                              }
                              className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-brand-600/10 border-brand-600'
                                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-white truncate">
                                  {new Date(p.preferredDate).toLocaleDateString()} · {itemsLabel}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {p.pickupAddress?.area} · {PICKUP_STATUS_LABEL[p.status] || p.status}
                                </p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-brand-500 shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    Address <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.addressId}
                    onChange={(e) => setForm({ ...form, addressId: e.target.value })}
                    required
                    disabled={addresses.length === 0}
                    className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50"
                  >
                    <option value="">Select an address</option>
                    {addresses.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.label ? `${a.label} — ` : ''}{a.area}, {a.city}
                        {a.isDefault ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                  {addresses.length === 0 && (
                    <p className="text-xs text-yellow-500 mt-2">
                      You don't have any saved addresses yet. Please add one in your profile first.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <CalendarDays className="w-4 h-4 text-gray-500" />
              {isPickupLinked ? 'Date of the missed pickup' : 'Missed date'} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.missedDate}
              onChange={(e) => setForm({ ...form, missedDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
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
            {complaints.map((c) => {
              const meta = CATEGORY_META[c.category] || CATEGORY_META['Other']
              const CategoryIcon = meta.icon
              const collectorName = c.assignedCollector?.user?.name

              return (
                <div key={c._id} className={`card-glass border-l-4 ${STATUS_BORDER[c.status]}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className={`${meta.badge} inline-flex items-center gap-1.5 mb-2`}>
                        <CategoryIcon className="w-3 h-3" />
                        {c.category}
                      </span>
                      {c.description && <p className="text-gray-300 text-sm">{c.description}</p>}
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

                  {collectorName && (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-3">
                      <User className="w-3 h-3 text-brand-500" />
                      <span className="text-gray-500">Assigned collector:</span> {collectorName}
                    </p>
                  )}


                  {c.resolutionNotes && (
                    <p className="text-xs text-gray-400 flex items-start gap-1.5 mt-3 pt-3 border-t border-gray-800">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-brand-500" />
                      <span>
                        <span className="text-gray-500">Resolution: </span>
                        {c.resolutionNotes}
                      </span>
                    </p>
                  )}

                  {c.statusHistory?.length > 0 && (
                    <div className={c.resolutionNotes ? 'mt-2' : 'mt-3 pt-3 border-t border-gray-800'}>
                      <button
                        onClick={() =>
                          setExpandedHistory((prev) => ({ ...prev, [c._id]: !prev[c._id] }))
                        }
                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                      >
                        <History className="w-3 h-3" />
                        {expandedHistory[c._id] ? 'Hide timeline' : 'View timeline'}
                        {expandedHistory[c._id] ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {expandedHistory[c._id] && (
                        <ul className="mt-3 pl-1 animate-fade-in">
                          {c.statusHistory.map((h, i) => (
                            <li key={i} className="relative pl-5 pb-3 last:pb-0">
                              {i !== c.statusHistory.length - 1 && (
                                <span className="absolute left-[3px] top-3 bottom-0 w-px bg-gray-800" />
                              )}
                              <span
                                className={`absolute left-0 top-1 w-2 h-2 rounded-full ${STATUS_DOT[h.status]}`}
                              />
                              <p className="text-xs text-gray-300">
                                {h.status}
                                <span className="text-gray-600 font-normal ml-2">
                                  {new Date(h.changedAt).toLocaleDateString()}
                                </span>
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResidentComplaintPage