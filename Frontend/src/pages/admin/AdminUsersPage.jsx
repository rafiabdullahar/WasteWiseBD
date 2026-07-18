import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Search, ChevronLeft, ChevronRight, UserCheck, UserX, Loader2 } from 'lucide-react'
import api from '../../services/api'

const ROLES = ['', 'resident', 'collector', 'partner', 'admin']

const AdminUsersPage = () => {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 15 })
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ role: '', search: '', page: 1 })

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.role) params.set('role', filters.role)
      if (filters.search) params.set('search', filters.search)
      params.set('page', filters.page)
      params.set('limit', 15)

      const { data } = await api.get(`/admin/users?${params.toString()}`)
      setUsers(data.data.users)
      setPagination(data.data.pagination)
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => fetchUsers(), 400)
    return () => clearTimeout(debounce)
  }, [filters])

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/status`)
      toast.success(data.message)
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">View and manage all platform users.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input-field pl-12"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          />
        </div>
        <select
          className="select-field w-full sm:w-48"
          value={filters.role}
          onChange={e => setFilters(f => ({ ...f, role: e.target.value, page: 1 }))}
        >
          <option value="">All Roles</option>
          <option value="resident">Resident</option>
          <option value="collector">Collector</option>
          <option value="partner">Partner</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header py-3 px-4">Name</th>
                  <th className="table-header py-3 px-4">Email</th>
                  <th className="table-header py-3 px-4">Role</th>
                  <th className="table-header py-3 px-4">Joined</th>
                  <th className="table-header py-3 px-4">Status</th>
                  <th className="table-header py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">No users found.</td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u._id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="table-cell font-medium text-white">{u.name}</td>
                    <td className="table-cell text-gray-400">{u.email}</td>
                    <td className="table-cell">
                      <span className={`badge capitalize ${
                        u.role === 'admin' ? 'badge-red' :
                        u.role === 'collector' ? 'badge-blue' :
                        u.role === 'partner' ? 'badge-yellow' :
                        'badge-green'
                      }`}>{u.role}</span>
                    </td>
                    <td className="table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(u._id, u.isActive)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            u.isActive
                              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/50'
                              : 'bg-brand-900/30 text-brand-400 hover:bg-brand-900/50 border border-brand-900/50'
                          }`}
                        >
                          {u.isActive ? <><UserX className="w-3.5 h-3.5" /> Deactivate</> : <><UserCheck className="w-3.5 h-3.5" /> Activate</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-800">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page === 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="btn-ghost disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="flex items-center px-3 text-sm text-gray-300">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="btn-ghost disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUsersPage
