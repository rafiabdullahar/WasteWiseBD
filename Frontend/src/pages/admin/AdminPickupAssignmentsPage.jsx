import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Truck,
  MapPin,
  Calendar,
  Clock,
  User,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import api from '../../services/api'

const AdminPickupAssignmentsPage = () => {
  const [requests, setRequests] = useState([])
  const [collectors, setCollectors] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [selectedCollector, setSelectedCollector] = useState('')
  const [assignmentNote, setAssignmentNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const [requestsResponse, collectorsResponse] = await Promise.all([
        api.get('/admin/pickup-requests'),
        api.get('/admin/collectors'),
      ])

      setRequests(requestsResponse.data.data.requests || [])
      setCollectors(collectorsResponse.data.data.collectors || [])
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load pickup requests and collectors.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSelectRequest = (request) => {
    setSelectedRequest(request)
    setSelectedCollector(request.assignedCollector?._id || '')
    setAssignmentNote('')
    setSuccess('')
    setError('')
  }

  const handleAssign = async () => {
    if (!selectedRequest) {
      setError('Please select a pickup request.')
      return
    }

    if (!selectedCollector) {
      setError('Please select a collector.')
      return
    }

    try {
      setIsAssigning(true)
      setError('')
      setSuccess('')

      const { data } = await api.patch(
        `/admin/pickup-requests/${selectedRequest._id}/assign`,
        {
          collectorId: selectedCollector,
          note: assignmentNote,
        }
      )

      const updatedRequest = data.data.request

      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request._id === updatedRequest._id
            ? updatedRequest
            : request
        )
      )

      setSelectedRequest(updatedRequest)

      setSuccess(data.message || 'Pickup request assigned successfully.')

      // Refresh collector workload after assignment.
      const collectorsResponse = await api.get('/admin/collectors')
      setCollectors(collectorsResponse.data.data.collectors || [])
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to assign pickup request.'
      )
    } finally {
      setIsAssigning(false)
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Not specified'

    return new Date(date).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTimeSlot = (slot) => {
    if (!slot) return 'Morning'

    return slot.charAt(0).toUpperCase() + slot.slice(1)
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-900/40 text-blue-300'
      case 'on_the_way':
        return 'bg-yellow-900/40 text-yellow-300'
      case 'collected':
        return 'bg-green-900/40 text-green-300'
      case 'failed':
        return 'bg-red-900/40 text-red-300'
      case 'cancelled':
        return 'bg-gray-800 text-gray-400'
      default:
        return 'bg-gray-800 text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">
            Collector Task Assignment
          </h1>

          <p className="page-subtitle">
            Assign pickup requests to available collectors based on
            service area and workload.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-800 bg-red-950/30 p-4 text-red-300">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-800 bg-green-950/30 p-4 text-green-300">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center text-blue-400">
              <ClipboardList className="w-6 h-6" />
            </div>

            <div>
              <p className="text-gray-400 text-sm font-medium">
                Pickup Requests
              </p>

              <h3 className="text-2xl font-bold text-white">
                {requests.length}
              </h3>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-900/50 flex items-center justify-center text-green-400">
              <Truck className="w-6 h-6" />
            </div>

            <div>
              <p className="text-gray-400 text-sm font-medium">
                Collectors
              </p>

              <h3 className="text-2xl font-bold text-white">
                {collectors.length}
              </h3>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-900/50 flex items-center justify-center text-yellow-400">
              <Clock className="w-6 h-6" />
            </div>

            <div>
              <p className="text-gray-400 text-sm font-medium">
                Unassigned
              </p>

              <h3 className="text-2xl font-bold text-white">
                {
                  requests.filter(
                    (request) =>
                      !request.assignedCollector &&
                      request.status === 'pending'
                  ).length
                }
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pickup Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Pickup Requests
              </h2>

              <p className="text-sm text-gray-400 mt-1">
                Select a request to assign a collector.
              </p>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500">
                No pickup requests found.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
              {requests.map((request) => (
                <button
                  key={request._id}
                  type="button"
                  onClick={() => handleSelectRequest(request)}
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    selectedRequest?._id === request._id
                      ? 'border-brand-500 bg-brand-900/20'
                      : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {request.resident?.name || 'Resident'}
                      </p>

                      <p className="text-sm text-gray-400 mt-1">
                        {request.serviceArea?.name ||
                          request.pickupAddress?.area ||
                          'Service area unavailable'}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
                        request.status
                      )}`}
                    >
                      {request.status?.replace('_', ' ') ||
                        'pending'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(request.preferredDate)}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {formatTimeSlot(request.preferredTimeSlot)}
                    </span>
                  </div>

                  <div className="mt-3 text-sm">
                    <span className="text-gray-500">
                      Assigned:
                    </span>{' '}
                    <span className="text-gray-300">
                      {request.assignedCollector?.user?.name ||
                        'Unassigned'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assignment Panel */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">
            Assignment
          </h2>

          {!selectedRequest ? (
            <div className="text-center py-16">
              <User className="w-12 h-12 mx-auto text-gray-600 mb-4" />

              <p className="text-gray-500">
                Select a pickup request to manage its assignment.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Request Details */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5">
                <h3 className="font-semibold text-white mb-4">
                  Request Details
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Resident
                    </span>

                    <span className="text-gray-200">
                      {selectedRequest.resident?.name ||
                        'Unknown'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Service Area
                    </span>

                    <span className="text-gray-200">
                      {selectedRequest.serviceArea?.name ||
                        'Unknown'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      City
                    </span>

                    <span className="text-gray-200">
                      {selectedRequest.serviceArea?.city ||
                        selectedRequest.pickupAddress?.city ||
                        'Unknown'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Pickup Date
                    </span>

                    <span className="text-gray-200">
                      {formatDate(
                        selectedRequest.preferredDate
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Time Slot
                    </span>

                    <span className="text-gray-200">
                      {formatTimeSlot(
                        selectedRequest.preferredTimeSlot
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Status
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
                        selectedRequest.status
                      )}`}
                    >
                      {selectedRequest.status?.replace(
                        '_',
                        ' '
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Assignment */}
              {selectedRequest.assignedCollector && (
                <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-5">
                  <p className="text-sm text-gray-400">
                    Currently assigned to
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <Truck className="w-5 h-5 text-blue-400" />

                    <div>
                      <p className="font-medium text-white">
                        {
                          selectedRequest.assignedCollector
                            ?.user?.name
                        }
                      </p>

                      <p className="text-xs text-gray-400">
                        Employee ID:{' '}
                        {selectedRequest.assignedCollector
                          ?.employeeId || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collector Selection */}
              <div>
                <label
                  htmlFor="collector"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Select Collector
                </label>

                <select
                  id="collector"
                  value={selectedCollector}
                  onChange={(event) =>
                    setSelectedCollector(event.target.value)
                  }
                  className="w-full rounded-xl bg-gray-900 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-brand-500"
                >
                  <option value="">
                    Select an available collector
                  </option>

                  {collectors.map((collector) => (
                    <option
                      key={collector._id}
                      value={collector._id}
                      disabled={!collector.isAvailable}
                    >
                      {collector.user?.name || 'Unnamed Collector'}
                      {' — '}
                      {collector.activeTaskCount || 0} active task
                      {collector.activeTaskCount === 1
                        ? ''
                        : 's'}
                      {!collector.isAvailable
                        ? ' — Unavailable'
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collector Workload */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Collector Workload
                </h3>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {collectors.map((collector) => (
                    <div
                      key={collector._id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        selectedCollector === collector._id
                          ? 'border-brand-500 bg-brand-900/20'
                          : 'border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Truck className="w-4 h-4 text-gray-400" />

                        <div>
                          <p className="text-sm text-white">
                            {collector.user?.name ||
                              'Unnamed Collector'}
                          </p>

                          <p className="text-xs text-gray-500">
                            {collector.isAvailable
                              ? 'Available'
                              : 'Unavailable'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {collector.activeTaskCount || 0}
                        </p>

                        <p className="text-xs text-gray-500">
                          active
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label
                  htmlFor="assignmentNote"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Assignment Note
                </label>

                <textarea
                  id="assignmentNote"
                  value={assignmentNote}
                  onChange={(event) =>
                    setAssignmentNote(event.target.value)
                  }
                  rows={3}
                  maxLength={300}
                  placeholder="Optional note for this assignment..."
                  className="w-full rounded-xl bg-gray-900 border border-gray-700 text-white px-4 py-3 resize-none focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Assign */}
              <button
                type="button"
                onClick={handleAssign}
                disabled={isAssigning || !selectedCollector}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAssigning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedRequest.assignedCollector
                      ? 'Reassign Collector'
                      : 'Assign Collector'}
                  </>
                )}
              </button>

              {/* Address */}
              {selectedRequest.pickupAddress && (
                <div className="rounded-xl bg-gray-900/40 border border-gray-800 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />

                    <div>
                      <p className="text-sm font-medium text-gray-300">
                        Pickup Location
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        {selectedRequest.pickupAddress.street}
                        {', '}
                        {selectedRequest.pickupAddress.area}
                        {', '}
                        {selectedRequest.pickupAddress.city}
                        {selectedRequest.pickupAddress.postalCode
                          ? `, ${selectedRequest.pickupAddress.postalCode}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPickupAssignmentsPage