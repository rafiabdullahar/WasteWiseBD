// Frontend/src/pages/resident/ResidentOverflowReportPage.jsx

import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  Camera,
  ImagePlus,
  X,
  MapPin,
  Send,
  Pencil,
  Trash2,
  Clock,
  Truck,
  CheckCircle2,
} from 'lucide-react'

const STEPS = ['Pending', 'In Progress', 'Resolved']

const STEP_ICON = {
  Pending: Clock,
  'In Progress': Truck,
  Resolved: CheckCircle2,
}

const emptyForm = { area: '', locationDescription: '', description: '' }

const StatusStepper = ({ status }) => {
  const currentIndex = STEPS.indexOf(status)

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const Icon = STEP_ICON[step]
        const done = i < currentIndex
        const active = i === currentIndex

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                  active
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : done
                    ? 'bg-brand-500/15 border-brand-700 text-brand-500'
                    : 'bg-gray-800 border-gray-700 text-gray-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  active ? 'text-white' : done ? 'text-brand-500' : 'text-gray-600'
                }`}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-px mx-1.5 mb-4 ${
                  i < currentIndex ? 'bg-brand-600' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const ResidentOverflowReportPage = () => {
  const [form, setForm] = useState(emptyForm)
  const [areas, setAreas] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const fileInputRef = useRef(null)

  const fetchAreas = async () => {
    try {
      const { data } = await api.get('/service-areas')
      if (data.success) setAreas(data.data.areas || [])
    } catch {
      toast.error('Could not load service areas')
    }
  }

  const fetchReports = async () => {
    try {
      const { data } = await api.get('/overflow-reports/my')
      if (data.success) setReports(data.data.reports)
    } catch {
      toast.error('Could not load your reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAreas()
    fetchReports()
  }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setPhotoFile(null)
    setPhotoPreview(null)
    setEditingId(null)
  }

  const setPhoto = (file) => {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, or WEBP image')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    setPhoto(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.area) {
      toast.error('Please select an area')
      return
    }
    if (!form.locationDescription.trim()) {
      toast.error('Please describe where the bin is')
      return
    }
    if (!editingId && !photoFile) {
      toast.error('A photo of the overflowing bin is required')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('area', form.area)
      formData.append('locationDescription', form.locationDescription)
      formData.append('description', form.description)
      if (photoFile) formData.append('photo', photoFile)

      const res = editingId
        ? await api.put(`/overflow-reports/${editingId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await api.post('/overflow-reports', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })

      if (res.data.success) {
        toast.success(editingId ? 'Report updated' : 'Report submitted')
        resetForm()
        fetchReports()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save report')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (r) => {
    if (!window.confirm('Edit this report?')) return
    setEditingId(r._id)
    setForm({
      area: r.area?._id || r.area,
      locationDescription: r.locationDescription,
      description: r.description || '',
    })
    setPhotoPreview(r.photoUrl)
    setPhotoFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return
    try {
      const { data } = await api.delete(`/overflow-reports/${id}`)
      if (data.success) {
        toast.success('Report deleted')
        setReports((prev) => prev.filter((r) => r._id !== id))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete report')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Report an Overflowing Bin</h1>
        <p className="text-gray-400">
          Spotted a public bin that's overflowing? Snap a photo and let us know where it is.
        </p>
      </div>

      <div className="card-glass border border-brand-900/40">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo dropzone — the primary action */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${
              dragActive
                ? 'border-brand-500 bg-brand-500/5'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0])}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Bin preview"
                  className="w-full max-h-72 object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoFile(null)
                    setPhotoPreview(null)
                  }}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-brand-500" />
                </div>
                <p className="text-gray-300 font-medium text-sm">
                  Drop a photo here, or click to choose one
                </p>
                <p className="text-gray-500 text-xs flex items-center gap-1">
                  <ImagePlus className="w-3 h-3" />
                  JPEG, PNG, or WEBP
                </p>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                Area <span className="text-red-500">*</span>
              </label>
              <select
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                required
                className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Select an area</option>
                {areas.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exact location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.locationDescription}
                onChange={(e) => setForm({ ...form, locationDescription: e.target.value })}
                placeholder="e.g. Beside the pharmacy, Road 11"
                required
                className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional details <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Anything else worth mentioning?"
              className="w-full rounded-xl bg-gray-800 border border-gray-700 p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Saving...' : editingId ? 'Update report' : 'Submit report'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Your Reports</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : reports.length === 0 ? (
          <div className="card-glass text-center py-10">
            <Camera className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">You haven't reported any overflowing bins yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r._id} className="card-glass flex flex-col sm:flex-row gap-4">
                <img
                  src={r.photoUrl}
                  alt="Reported bin"
                  className="w-full sm:w-28 h-28 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{r.locationDescription}</p>
                      <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {r.area?.name || 'Unknown area'}
                      </p>
                    </div>
                  </div>

                  {r.description && (
                    <p className="text-gray-400 text-sm mt-2">{r.description}</p>
                  )}

                  <div className="mt-4 overflow-x-auto">
                    <StatusStepper status={r.status} />
                  </div>

                  {r.status === 'Pending' && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800">
                      <button
                        onClick={() => handleEdit(r)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 hover:bg-gray-800 rounded-lg"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 px-3 py-1.5 hover:bg-red-950/30 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResidentOverflowReportPage