import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Calendar,
  Plus,
  Trash2,
  Bell,
  Loader2,
  X,
  Save,
  CalendarClock,
  ChevronDown,
} from 'lucide-react'
import api from '../../services/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIME_SLOTS = ['morning', 'afternoon', 'evening']
const TIME_LABELS = { morning: '6:00 AM – 12:00 PM', afternoon: '12:00 PM – 5:00 PM', evening: '5:00 PM – 9:00 PM' }
const CATEGORIES = ['organic', 'plastic', 'paper', 'glass', 'metal', 'electronic', 'hazardous']
const CATEGORY_COLORS = {
  organic: 'badge-green', plastic: 'badge-blue', paper: 'badge-yellow',
  glass: 'badge-blue', metal: 'badge-gray', electronic: 'badge-red', hazardous: 'badge-red',
}

const EMPTY_FORM = { serviceArea: '', dayOfWeek: 'Monday', timeSlot: 'morning', wasteCategories: [], description: '' }

const AdminSchedulesPage = () => {
  const [schedules, setSchedules] = useState([])
  const [serviceAreas, setServiceAreas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [filterArea, setFilterArea] = useState('')
  const [remindingId, setRemindingId] = useState(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const params = filterArea ? `?serviceArea=${filterArea}` : ''
      const [schedulesRes, areasRes] = await Promise.all([
        api.get(`/schedules${params}`),
        api.get('/service-areas?includeInactive=false'),
      ])
      setSchedules(schedulesRes.data.data.schedules)
      setServiceAreas(areasRes.data.data.areas)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filterArea])

  const openCreateForm = () => {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = (s) => {
    setEditingId(s._id)
    setFormData({
      serviceArea: s.serviceArea._id,
      dayOfWeek: s.dayOfWeek,
      timeSlot: s.timeSlot,
      wasteCategories: s.wasteCategories || [],
      description: s.description || '',
    })
    setShowForm(true)
  }

  const toggleCategory = (cat) => {
    setFormData((prev) => ({
      ...prev,
      wasteCategories: prev.wasteCategories.includes(cat)
        ? prev.wasteCategories.filter((c) => c !== cat)
        : [...prev.wasteCategories, cat],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/schedules/${editingId}`, formData)
        toast.success('Schedule updated')
      } else {
        await api.post('/schedules', formData)
        toast.success('Schedule created')
      }
      setShowForm(false)
      setEditingId(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule?')) return
    try {
      await api.delete(`/schedules/${id}`)
      toast.success('Schedule deleted')
      fetchData()
    } catch {
      toast.error('Failed to delete schedule')
    }
  }

  const handleSendReminders = async (id, areaName) => {
    setRemindingId(id)
    try {
      const { data } = await api.post(`/schedules/${id}/send-reminders`)
      toast.success(`Reminders sent to ${data.data.notified} resident(s) in ${areaName}`)
    } catch {
      toast.error('Failed to send reminders')
    } finally {
      setRemindingId(null)
    }
  }

  // Group schedules by day of week for a structured view
  const schedulesByDay = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter((s) => s.dayOfWeek === day)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">Collection Schedules</h1>
          <p className="page-subtitle">Create and manage regular waste collection timetables by area.</p>
        </div>
        <button onClick={openCreateForm} className="btn-primary shrink-0">
          <Plus className="w-5 h-5" /> Add Schedule
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="relative w-full sm:w-72">
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            className="select-field"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
          >
            <option value="">All Service Areas</option>
            {serviceAreas.map((a) => (
              <option key={a._id} value={a._id}>{a.name} — {a.city}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-500">{schedules.length} schedule(s)</span>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card border-brand-700/50 animate-slide-up">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-brand-400" />
              {editingId ? 'Edit Schedule' : 'New Collection Schedule'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-ghost p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="input-label">Service Area *</label>
                <select
                  required
                  className="select-field"
                  value={formData.serviceArea}
                  onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                  disabled={!!editingId}
                >
                  <option value="">Select area...</option>
                  {serviceAreas.map((a) => (
                    <option key={a._id} value={a._id}>{a.name} — {a.city}</option>
                  ))}
                </select>
                {editingId && <p className="text-xs text-gray-600 mt-1">Area cannot be changed after creation.</p>}
              </div>

              <div>
                <label className="input-label">Day of Week *</label>
                <select
                  className="select-field"
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="input-label">Time Slot *</label>
                <select
                  className="select-field"
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} ({TIME_LABELS[t]})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">Waste Categories</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 capitalize ${
                      formData.wasteCategories.includes(cat)
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="input-label">Notes / Description</label>
              <textarea
                className="input-field resize-none min-h-[70px]"
                placeholder="Optional notes for residents..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {editingId ? 'Update' : 'Create Schedule'}</>}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calendar Grid View */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
      ) : schedules.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No schedules yet</h3>
          <p className="text-gray-500 text-sm mb-6">Create collection schedules to display timetables for residents.</p>
          <button onClick={openCreateForm} className="btn-primary mx-auto">
            <Plus className="w-5 h-5" /> Create First Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day) => {
            const daySchedules = schedulesByDay[day]
            if (daySchedules.length === 0) return null
            return (
              <div key={day} className="card">
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
                  {day}
                </h3>
                <div className="space-y-3">
                  {daySchedules.map((s) => (
                    <div
                      key={s._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-800/60 rounded-xl border border-gray-700/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white font-medium text-sm">
                            {s.serviceArea?.name}
                          </span>
                          <span className="text-gray-500 text-xs">— {s.serviceArea?.city}</span>
                          <span className={`badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          🕐 {TIME_LABELS[s.timeSlot]}
                        </p>
                        {s.wasteCategories?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {s.wasteCategories.map((cat) => (
                              <span key={cat} className={`badge ${CATEGORY_COLORS[cat]} capitalize text-xs`}>
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                        {s.description && (
                          <p className="text-xs text-gray-500 mt-2 italic">{s.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleSendReminders(s._id, s.serviceArea?.name)}
                          disabled={remindingId === s._id}
                          title="Send reminders to residents in this area"
                          className="btn-ghost text-xs gap-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
                        >
                          {remindingId === s._id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Bell className="w-4 h-4" />}
                          Remind
                        </button>
                        <button onClick={() => openEditForm(s)} className="btn-ghost text-xs">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="btn-ghost text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminSchedulesPage
