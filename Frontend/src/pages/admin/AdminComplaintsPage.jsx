// import { useState, useEffect, useMemo } from 'react'
// import api from '../../services/api'
// import toast from 'react-hot-toast'
// import { AlertTriangle, MapPin, CalendarDays, Clock, Paperclip, History, MessageSquare } from 'lucide-react'

// const STATUSES = ['Open', 'Investigating', 'Resolved', 'Closed']

// const STATUS_STYLES = {
//   Open: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
//   Investigating: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
//   Resolved: 'bg-green-950/40 text-green-400 border-green-900/50',
//   Closed: 'bg-gray-800 text-gray-400 border-gray-700',
// }

// const AdminComplaintsPage = () => {
//   const [complaints, setComplaints] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [activeFilter, setActiveFilter] = useState('All')
//   const [pendingStatus, setPendingStatus] = useState({})
//   const [noteDrafts, setNoteDrafts] = useState({})
//   const [expandedHistory, setExpandedHistory] = useState({})

//   const fetchComplaints = async () => {
//     try {
//       const { data } = await api.get('/complaints')
//       if (data.success) setComplaints(data.data.complaints)
//     } catch {
//       toast.error('Could not load complaints')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     fetchComplaints()
//   }, [])

//   const handleStatusChange = async (id) => {
//     const status = pendingStatus[id]
//     if (!status) return

//     const note = (noteDrafts[id] || '').trim()

//     if (status === 'Resolved' && !note) {
//       toast.error('Please add resolution notes before marking as Resolved')
//       return
//     }

//     try {
//       const { data } = await api.patch(`/complaints/${id}/status`, {
//         status,
//         resolutionNotes: note,
//       })
//       if (data.success) {
//         toast.success('Status updated')
//         setComplaints((prev) => prev.map((c) => (c._id === id ? data.data.complaint : c)))
//         setPendingStatus((prev) => {
//           const next = { ...prev }
//           delete next[id]
//           return next
//         })
//         setNoteDrafts((prev) => ({ ...prev, [id]: '' }))
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Failed to update status')
//     }
//   }

//   const counts = useMemo(() => {
//     const result = { All: complaints.length, Open: 0, Investigating: 0, Resolved: 0, Closed: 0 }
//     complaints.forEach((c) => { result[c.status] = (result[c.status] || 0) + 1 })
//     return result
//   }, [complaints])

//   const filtered = useMemo(() => {
//     return complaints.filter((c) => activeFilter === 'All' || c.status === activeFilter)
//   }, [complaints, activeFilter])

//   return (
//     <div className="max-w-4xl mx-auto space-y-8">
//       <div className="flex items-center gap-3">
//         <div className="w-10 h-10 bg-brand-600/10 rounded-xl flex items-center justify-center shrink-0">
//           <AlertTriangle className="w-5 h-5 text-brand-500" />
//         </div>
//         <div>
//           <h1 className="text-3xl font-bold text-white">Complaints</h1>
//           <p className="text-gray-400">Review and resolve resident complaints.</p>
//         </div>
//       </div>

//       <div className="flex flex-wrap gap-2">
//         {['All', ...STATUSES].map((s) => (
//           <button
//             key={s}
//             onClick={() => setActiveFilter(s)}
//             className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
//               activeFilter === s
//                 ? 'bg-brand-600 text-white border-brand-600'
//                 : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
//             }`}
//           >
//             {s} ({counts[s] || 0})
//           </button>
//         ))}
//       </div>

//       {loading ? (
//         <p className="text-gray-500">Loading...</p>
//       ) : filtered.length === 0 ? (
//         <div className="card-glass text-center py-10">
//           <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
//           <p className="text-gray-500">No complaints match this view.</p>
//         </div>
//       ) : (
//         <div className="space-y-3">
//           {filtered.map((c) => {
//             const currentSelection = pendingStatus[c._id] ?? c.status
//             const isChangingStatus = currentSelection !== c.status

//             return (
//               <div key={c._id} className="card-glass">
//                 <div className="flex items-start justify-between gap-4 mb-3">
//                   <div>
//                     <p className="text-white font-medium">{c.resident?.name}</p>
//                     <p className="text-xs text-gray-500">{c.resident?.email}</p>
//                     <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
//                       <Clock className="w-3 h-3" />
//                       Filed on {new Date(c.createdAt).toLocaleDateString()}
//                     </p>
//                   </div>
//                   <span className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[c.status]}`}>
//                     {c.status}
//                   </span>
//                 </div>

//                 <div className="flex items-center gap-2 mb-2">
//                   <span className="text-xs font-semibold text-brand-500 bg-brand-600/10 px-2.5 py-1 rounded-lg">
//                     {c.category}
//                   </span>
//                 </div>

//                 {c.description && (
//                   <p className="text-gray-300 text-sm mb-3">{c.description}</p>
//                 )}

//                 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
//                   <span className="flex items-center gap-1">
//                     <MapPin className="w-3 h-3" />
//                     {c.area || '—'}
//                   </span>
//                   <span className="flex items-center gap-1">
//                     <CalendarDays className="w-3 h-3" />
//                     Missed on {c.missedDate ? new Date(c.missedDate).toLocaleDateString() : '—'}
//                   </span>
//                 </div>

//                 {c.evidenceUrl && (
//                   <a
//                     href={`http://localhost:5001${c.evidenceUrl}`}
//                     target="_blank"
//                     rel="noreferrer"
//                     className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline mb-3"
//                   >
//                     <Paperclip className="w-3 h-3" />
//                     View attached photo
//                   </a>
//                 )}

//                 <div className="pt-3 border-t border-gray-800 space-y-2">
//                   <div className="flex items-center gap-2">
//                     <label className="text-xs text-gray-500">Update status:</label>
//                     <select
//                       value={currentSelection}
//                       onChange={(e) =>
//                         setPendingStatus((prev) => ({ ...prev, [c._id]: e.target.value }))
//                       }
//                       className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
//                     >
//                       {STATUSES.map((s) => (
//                         <option key={s} value={s}>{s}</option>
//                       ))}
//                     </select>
//                   </div>

//                   {isChangingStatus && (
//                     <div className="space-y-2">
//                       <textarea
//                         value={noteDrafts[c._id] || ''}
//                         onChange={(e) =>
//                           setNoteDrafts((prev) => ({ ...prev, [c._id]: e.target.value }))
//                         }
//                         placeholder={
//                           currentSelection === 'Resolved'
//                             ? 'Resolution notes (required)'
//                             : 'Add a note (optional)'
//                         }
//                         rows={2}
//                         className="w-full bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
//                       />
//                       <button
//                         onClick={() => handleStatusChange(c._id)}
//                         className="btn-primary text-xs px-4 py-1.5"
//                       >
//                         Save status change
//                       </button>
//                     </div>
//                   )}

//                   {c.resolutionNotes && (
//                     <p className="text-xs text-gray-400 flex items-start gap-1.5">
//                       <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
//                       <span>
//                         <span className="text-gray-500">Resolution notes: </span>
//                         {c.resolutionNotes}
//                       </span>
//                     </p>
//                   )}

//                   {c.statusHistory?.length > 0 && (
//                     <div>
//                       <button
//                         onClick={() =>
//                           setExpandedHistory((prev) => ({ ...prev, [c._id]: !prev[c._id] }))
//                         }
//                         className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
//                       >
//                         <History className="w-3 h-3" />
//                         {expandedHistory[c._id] ? 'Hide history' : `View history (${c.statusHistory.length})`}
//                       </button>

//                       {expandedHistory[c._id] && (
//                         <ul className="mt-2 space-y-1.5 text-xs text-gray-500 border-l border-gray-800 pl-3">
//                           {c.statusHistory.map((h, i) => (
//                             <li key={i}>
//                               <span className="text-gray-300">{h.status}</span>
//                               {' — '}
//                               {new Date(h.changedAt).toLocaleString()}
//                               {h.note && (
//                                 <span className="block text-gray-500 italic">"{h.note}"</span>
//                               )}
//                             </li>
//                           ))}
//                         </ul>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )
//           })}
//         </div>
//       )}
//     </div>
//   )
// }

// export default AdminComplaintsPage

import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  AlertTriangle, MapPin, CalendarDays, Clock, Paperclip,
  History, MessageSquare, ChevronDown, ChevronUp,
  Package, AlertOctagon, Trash2, HelpCircle,
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
  'Bin Overflow': { icon: Trash2, badge: 'badge-yellow' },
  'Other': { icon: HelpCircle, badge: 'badge-gray' },
}

const AdminComplaintsPage = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [pendingStatus, setPendingStatus] = useState({})
  const [noteDrafts, setNoteDrafts] = useState({})
  const [expandedHistory, setExpandedHistory] = useState({})

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

  const handleStatusChange = async (id) => {
    const status = pendingStatus[id]
    if (!status) return

    const note = (noteDrafts[id] || '').trim()

    if (status === 'Resolved' && !note) {
      toast.error('Please add resolution notes before marking as Resolved')
      return
    }

    try {
      const { data } = await api.patch(`/complaints/${id}/status`, {
        status,
        resolutionNotes: note,
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

                <div className="pt-3 border-t border-gray-800 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Update status</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            setPendingStatus((prev) => ({ ...prev, [c._id]: s }))
                          }
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
                        placeholder={
                          currentSelection === 'Resolved'
                            ? 'Resolution notes (required)'
                            : 'Add a note (optional)'
                        }
                        rows={2}
                        className="input-field text-sm"
                      />
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