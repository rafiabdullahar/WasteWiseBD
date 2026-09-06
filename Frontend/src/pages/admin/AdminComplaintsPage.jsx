import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  AlertTriangle, MapPin, CalendarDays, Clock,
  History, MessageSquare, ChevronDown, ChevronUp,
  Package, AlertOctagon, HelpCircle,
  User, Users, Star, Truck,
} from 'lucide-react'

const STATUSES = ['Open', 'Investigating', 'Resolved', 'Closed']

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

const AdminComplaintsPage = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [pendingStatus, setPendingStatus] = useState({})
  const [noteDrafts, setNoteDrafts] = useState({})
  const [expandedHistory, setExpandedHistory] = useState({})
  const [suggestingFor, setSuggestingFor] = useState(null)
  const [suggestions, setSuggestions] = useState({})
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [assigningId, setAssigningId] = useState(null)
  const [faultDrafts, setFaultDrafts] = useState({})

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

  const submitStatusChange = async (id, status, note = '', atFault = '') => {
    try {
      const { data } = await api.patch(`/complaints/${id}/status`, {
        status,
        resolutionNotes: note,
        atFault,
      })
      if (data.success) {
        toast.success('Status updated')
        setComplaints((prev) => prev.map((c) => (c._id === id ? data.data.complaint : c)))
        setPendingStatus((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        setNoteDrafts((prev) => ({ ...prev, [id]: '' }))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const handleStatusClick = (id, status) => {
    if (status === 'Resolved') {
      setPendingStatus((prev) => ({ ...prev, [id]: status }))
      return
    }
    submitStatusChange(id, status)
  }

  const handleStatusChange = (id) => {
    const status = pendingStatus[id]
    if (!status) return

    const note = (noteDrafts[id] || '').trim()
    const fault = faultDrafts[id]

    if (!note) {
      toast.error('Please add resolution notes before marking as Resolved')
      return
    }
    
    submitStatusChange(id, status, note, fault)
  }

  const handleShowSuggestions = async (id) => {
    if (suggestingFor === id) {
      setSuggestingFor(null)
      return
    }

    setSuggestingFor(id)

    if (suggestions[id]) return

    setLoadingSuggestions(true)
    try {
      const { data } = await api.get(`/complaints/${id}/suggested-collectors`)
      if (data.success) {
        setSuggestions((prev) => ({ ...prev, [id]: data.data.collectors }))
      }
    } catch {
      toast.error('Could not load suggested collectors')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleAssign = async (complaintId, collectorId) => {
    setAssigningId(collectorId)
    try {
      const { data } = await api.patch(`/complaints/${complaintId}/assign`, { collectorId })
      if (data.success) {
        toast.success('Collector assigned')
        setComplaints((prev) => prev.map((c) => (c._id === complaintId ? data.data.complaint : c)))
        setSuggestingFor(null)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign collector')
    } finally {
      setAssigningId(null)
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
          <h1 className="page-title">Complaints</h1>
          <p className="page-subtitle">Review and resolve resident complaints.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['All', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            className={`stat-card text-left transition-all ${
              activeFilter === s ? 'border-brand-600 bg-brand-600/5' : ''
            }`}
          >
            <span className="text-2xl font-bold text-white">{counts[s] || 0}</span>
            <span className="text-xs text-gray-500 font-medium">{s}</span>
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
          {filtered.map((c) => {
            const currentSelection = pendingStatus[c._id] ?? c.status
            const isChangingStatus = currentSelection !== c.status
            const meta = CATEGORY_META[c.category] || CATEGORY_META['Other']
            const CategoryIcon = meta.icon
            const collectorName = c.assignedCollector?.user?.name

            return (
              <div
                key={c._id}
                className={`card-glass border-l-4 ${STATUS_BORDER[c.status]}`}
              >
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
                  <span className={`${meta.badge} inline-flex items-center gap-1.5`}>
                    <CategoryIcon className="w-3 h-3" />
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

      

                <div className="mb-3">
                  {collectorName ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-600/5 border border-brand-900/40">
                      <User className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span className="text-xs text-gray-300">
                        <span className="text-gray-500">Assigned to</span> {collectorName}
                        {c.assignedCollector?.employeeId && (
                          <span className="text-gray-600"> · #{c.assignedCollector.employeeId}</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => handleShowSuggestions(c._id)}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 border border-gray-800"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Suggest collectors
                        {suggestingFor === c._id ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {suggestingFor === c._id && (
                        <div className="mt-2 space-y-1.5 animate-fade-in">
                          {loadingSuggestions ? (
                            <p className="text-xs text-gray-500 px-2">Loading...</p>
                          ) : !suggestions[c._id] || suggestions[c._id].length === 0 ? (
                            <p className="text-xs text-gray-500 px-2">
                              No collectors cover this area yet.
                            </p>
                          ) : (
                            suggestions[c._id].map((col) => (
                              <button
                                key={col._id}
                                onClick={() => handleAssign(c._id, col._id)}
                                disabled={assigningId === col._id}
                                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:border-brand-600 transition-colors text-left disabled:opacity-50"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs text-white truncate">
                                    {col.user?.name}
                                    {col.employeeId && (
                                      <span className="text-gray-500"> · #{col.employeeId}</span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                                    <span className="flex items-center gap-0.5">
                                      <Truck className="w-2.5 h-2.5" />
                                      {col.vehicleType}
                                    </span>
                                    {col.averageRating > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <Star className="w-2.5 h-2.5" />
                                        {col.averageRating.toFixed(1)}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <span className="text-[11px] text-brand-500 shrink-0">
                                  {assigningId === col._id ? 'Assigning...' : 'Assign'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-800 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Update status</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusClick(c._id, s)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                            currentSelection === s
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isChangingStatus && (
                    <div className="space-y-2 animate-fade-in">
                      <textarea
                        value={noteDrafts[c._id] || ''}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [c._id]: e.target.value }))
                        }
                        placeholder="Resolution notes (required)"
                        rows={2}
                        className="input-field text-sm"
                      />
                      <select
                        value={faultDrafts[c._id] || ''}
                        onChange={(e) =>
                          setFaultDrafts((prev) => ({ ...prev, [c._id]: e.target.value }))
                        }
                        className="input-field text-sm"
                      >
                        <option value="">Was the complaint applicable against this particular collector?</option>
                        <option value="valid">Valid — collector was at fault</option>
                        <option value="invalid">Invalid — not the collector's fault</option>
                        <option value="inconclusive">Inconclusive</option>
                      </select>
                      <button
                        onClick={() => handleStatusChange(c._id)}
                        className="btn-primary text-xs px-4 py-1.5"
                      >
                        Save status change
                      </button>
                    </div>
                  )}

                  {c.resolutionNotes && (
                    <p className="text-xs text-gray-400 flex items-start gap-1.5">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>
                        <span className="text-gray-500">Resolution notes: </span>
                        {c.resolutionNotes}
                      </span>
                    </p>
                  )}

                  {c.statusHistory?.length > 0 && (
                    <div>
                      <button
                        onClick={() =>
                          setExpandedHistory((prev) => ({ ...prev, [c._id]: !prev[c._id] }))
                        }
                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                      >
                        <History className="w-3 h-3" />
                        {expandedHistory[c._id] ? 'Hide history' : `View history (${c.statusHistory.length})`}
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
                                  {new Date(h.changedAt).toLocaleString()}
                                </span>
                              </p>
                              {h.note && (
                                <p className="text-xs text-gray-500 italic mt-0.5">"{h.note}"</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminComplaintsPage