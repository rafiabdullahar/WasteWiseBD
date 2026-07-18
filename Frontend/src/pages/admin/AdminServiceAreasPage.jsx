import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, MapPin, Edit2, ToggleLeft, ToggleRight, X, Save, Loader2 } from 'lucide-react'
import api from '../../services/api'

const EMPTY_FORM = {
  name: '',
  city: '',
  districts: '',
  description: '',
  collectionSchedule: '',
}

const AdminServiceAreasPage = () => {
  const [areas, setAreas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const fetchAreas = async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/service-areas?includeInactive=true')
      setAreas(data.data.areas)
    } catch (error) {
      toast.error('Failed to load service areas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAreas()
  }, [])

  const openCreateForm = () => {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = (area) => {
    setEditingId(area._id)
    setFormData({
      name: area.name,
      city: area.city,
      districts: area.districts?.join(', ') || '',
      description: area.description || '',
      collectionSchedule: area.collectionSchedule || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        districts: formData.districts.split(',').map(d => d.trim()).filter(Boolean)
      }

      if (editingId) {
        await api.put(`/service-areas/${editingId}`, payload)
        toast.success('Service area updated')
      } else {
        await api.post('/service-areas', payload)
        toast.success('Service area created')
      }
      setShowForm(false)
      setEditingId(null)
      fetchAreas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (id, currentlyActive) => {
    try {
      await api.patch(`/service-areas/${id}/toggle`)
      toast.success(`Area ${currentlyActive ? 'deactivated' : 'activated'}`)
      fetchAreas()
    } catch (error) {
      toast.error('Failed to update area status')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Service Areas</h1>
          <p className="page-subtitle">Create and manage collection service areas across Bangladesh.</p>
        </div>
        <button onClick={openCreateForm} className="btn-primary shrink-0">
          <Plus className="w-5 h-5" /> Add Service Area
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card border-brand-500/30 animate-slide-up">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-400" />
              {editingId ? 'Edit Service Area' : 'Create New Service Area'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-ghost p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="input-label">Area Name *</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Gulshan"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="input-label">City *</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Dhaka"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
              />
            </div>
            <div>
              <label className="input-label">Districts / Thanas (comma-separated)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Gulshan 1, Gulshan 2, Banani"
                value={formData.districts}
                onChange={e => setFormData({...formData, districts: e.target.value})}
              />
            </div>
            <div>
              <label className="input-label">Collection Schedule</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Mon, Wed, Fri — 8am to 12pm"
                value={formData.collectionSchedule}
                onChange={e => setFormData({...formData, collectionSchedule: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="input-label">Description</label>
              <textarea
                className="input-field min-h-[80px] resize-none"
                placeholder="Brief notes about this service area..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {editingId ? 'Update Area' : 'Create Area'}</>}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Areas Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
      ) : areas.length === 0 ? (
        <div className="card text-center py-16">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No service areas yet</h3>
          <p className="text-gray-500 text-sm mb-6">Create your first service area to allow residents to schedule pickups.</p>
          <button onClick={openCreateForm} className="btn-primary mx-auto">
            <Plus className="w-5 h-5" /> Create First Area
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {areas.map(area => (
            <div key={area._id} className={`card flex flex-col transition-colors ${area.isActive ? 'hover:border-gray-700' : 'opacity-60 border-gray-800'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-900/40 flex items-center justify-center text-blue-400 shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className={`badge ${area.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {area.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">{area.name}</h3>
              <p className="text-sm text-gray-400 mb-1">{area.city}</p>

              {area.districts?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 my-3">
                  {area.districts.map(d => (
                    <span key={d} className="badge badge-gray text-xs">{d}</span>
                  ))}
                </div>
              )}

              {area.collectionSchedule && (
                <p className="text-sm text-gray-500 mt-1">
                  🗓 {area.collectionSchedule}
                </p>
              )}

              {area.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-1">{area.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-800 flex gap-2">
                <button
                  onClick={() => openEditForm(area)}
                  className="btn-ghost flex-1 text-sm justify-center"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(area._id, area.isActive)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                    area.isActive
                      ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/40'
                      : 'bg-brand-900/30 text-brand-400 hover:bg-brand-900/50 border border-brand-900/40'
                  }`}
                >
                  {area.isActive
                    ? <><ToggleLeft className="w-4 h-4" /> Deactivate</>
                    : <><ToggleRight className="w-4 h-4" /> Activate</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminServiceAreasPage
