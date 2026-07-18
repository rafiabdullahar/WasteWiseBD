import { Routes, Route, Navigate } from 'react-router-dom'
import { PrivateRoute, RoleRoute } from './components/PrivateRoute'
import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Resident
import ResidentDashboard from './pages/resident/ResidentDashboard'
import ResidentProfilePage from './pages/resident/ResidentProfilePage'
import RecyclingRequestPage from './pages/resident/RecyclingRequestPage'

// Collector
import CollectorDashboard from './pages/collector/CollectorDashboard'
import CollectorProfilePage from './pages/collector/CollectorProfilePage'

// Partner
import PartnerDashboard from './pages/partner/PartnerDashboard'
import PartnerProfilePage from './pages/partner/PartnerProfilePage'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminPartnersPage from './pages/admin/AdminPartnersPage'
import AdminServiceAreasPage from './pages/admin/AdminServiceAreasPage'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route path="/unauthorized" element={
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-center p-4">
          <div className="card-glass border border-red-900/50">
            <h1 className="text-3xl font-bold text-white mb-4">Unauthorized Access</h1>
            <p className="text-gray-400 mb-6">You don't have permission to view this page.</p>
            <button 
              onClick={() => window.history.back()} 
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      } />

      {/* Protected Routes inside MainLayout */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          
          {/* Resident Routes */}
          <Route element={<RoleRoute roles={['resident']} />}>
            <Route path="/resident/dashboard" element={<ResidentDashboard />} />
            <Route path="/resident/profile" element={<ResidentProfilePage />} />
            <Route path="/resident/recycling" element={<RecyclingRequestPage />} />
          </Route>

          {/* Collector Routes */}
          <Route element={<RoleRoute roles={['collector']} />}>
            <Route path="/collector/dashboard" element={<CollectorDashboard />} />
            <Route path="/collector/profile" element={<CollectorProfilePage />} />
          </Route>

          {/* Partner Routes */}
          <Route element={<RoleRoute roles={['partner']} />}>
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/partner/profile" element={<PartnerProfilePage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/partners" element={<AdminPartnersPage />} />
            <Route path="/admin/service-areas" element={<AdminServiceAreasPage />} />
          </Route>

        </Route>
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
