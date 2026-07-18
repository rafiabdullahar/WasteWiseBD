import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Plus, X } from 'lucide-react'

const CATEGORIES = ["Organic", "Plastic", "Paper", "Glass", "Metal", "Electronic", "Hazardous"]

const emptyForm = {
  wasteCategory: '',
  title: '',
  instructions: '',
  doList: '',
  dontList: '',
  isRecyclable: false,
}

const AdminGuidelinesPage = () => {
  const [guidelines, setGuidelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchGuidelines = async () => {
    try {
      const { data } = await api.get('/guidelines')
      if (data.success) setGuidelines(data.data.guidelines)
    } catch {
      toast.error('Could not load guidelines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuidelines()
  }, [])

  const openCreateForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const openEditForm = (g) => {
    setForm({
      wasteCategory: g.wasteCategory,
      title: g.title,
      instructions: g.instructions,
      doList: g.doList.join('\n'),
      dontList: g.dontList.join('\n'),
      isRecyclable: g.isRecyclable,
    })
    setEditingId(g._id)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      wasteCategory: form.wasteCategory,
      title: form.title,
      instructions: form.instructions,
      doList: form.doList.split('\n').map((s) => s.trim()).filter(Boolean),
      dontList: form.dontList.split('\n').map((s) => s.trim()).filter(Boolean),
      isRecyclable: form.isRecyclable,
    }

    try {
      const { data } = editingId
        ? await api.put(`/guidelines/${editingId}`, payload)
        : await api.post('/guidelines', payload)

      if (data.success) {
        toast.success(editingId ? 'Guideline updated' : 'Guideline created')
        closeForm()
        fetchGuidelines()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save guideline')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this guideline?')) return
    try {
      const { data } = await api.delete(`/guidelines/${id}`)
      if (data.success) {
        toast.success('Guideline deleted')
        setGuidelines((prev) => prev.filter((g) => g._id !== id))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete guideline')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Disposal Guidelines</h1>
          <p className="text-gray-400">Manage waste category guidance shown to residents.</p>
        </div>
        <button onClick={openCreateForm} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Guideline
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="card-glass space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? 'Edit Guideline' : 'New Guideline'}
            </h2>
            <button type="button" onClick={closeForm} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Waste Category</label>
            <select
              value={form.wasteCategory}
              onChange={(e) => setForm({ ...form, wasteCategory: e.target.value })}
              required
              disabled={!!editingId}
              className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              required
              rows={3}
              className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Do's (one per line)
              </label>
              <textarea
                value={form.doList}
                onChange={(e) => setForm({ ...form, doList: e.target.value })}
                rows={4}
                className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Don'ts (one per line)
              </label>
              <textarea
                value={form.dontList}
                onChange={(e) => setForm({ ...form, dontList: e.target.value })}
                rows={4}
                className="w-full rounded-xl bg-gray-800 border border-gray-700 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.isRecyclable}
              onChange={(e) => setForm({ ...form, isRecyclable: e.target.checked })}
              className="rounded"
            />
            This category is recyclable
          </label>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : editingId ? 'Update Guideline' : 'Create Guideline'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid gap-3">
          {guidelines.map((g) => (
            <div key={g._id} className="card-glass flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold">{g.title}</p>
                <p className="text-xs text-gray-500">{g.wasteCategory} · {g.isRecyclable ? 'Recyclable' : 'Not recyclable'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditForm(g)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(g._id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminGuidelinesPage