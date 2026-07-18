import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * PrivateRoute — redirects to /login if the user is not authenticated.
 * Wrap any route that requires authentication with this component.
 */
export const PrivateRoute = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

/**
 * RoleRoute — redirects to /unauthorized if the authenticated user does not
 * have one of the required roles.
 * Must be nested inside PrivateRoute.
 *
 * Usage:
 *   <Route element={<RoleRoute roles={['admin']} />}>
 *     <Route path="/admin/dashboard" element={<AdminDashboard />} />
 *   </Route>
 */
export const RoleRoute = ({ roles }) => {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
