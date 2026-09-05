import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Leaf,
  LogOut,
  Menu,
  X,
  Home,
  User,
  Recycle,
  Map,
  Users,
  Settings,
  LayoutDashboard,
  MessageSquareWarning,
  BookOpen,
  Truck,
} from 'lucide-react'

const MainLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Define navigation links based on user role
  const getNavLinks = () => {
    if (!user) return []

    switch (user.role) {
      case 'resident':
        return [
          {
            name: 'Dashboard',
            path: '/resident/dashboard',
            icon: LayoutDashboard,
          },
          {
            name: 'Profile',
            path: '/resident/profile',
            icon: User,
          },
          {
            name: 'Waste Pickup',
            path: '/resident/pickups',
            icon: Truck,
          },
          {
            name: 'Recycling',
            path: '/resident/recycling',
            icon: Recycle,
          },
          {
            name: 'Complaints',
            path: '/resident/complaints',
            icon: MessageSquareWarning,
          },
          {
            name: 'Guidelines',
            path: '/resident/guidelines',
            icon: BookOpen,
          },
        ]
      case 'collector':
        return [
          { name: 'Dashboard', path: '/collector/dashboard', icon: LayoutDashboard },
          { name: 'Profile', path: '/collector/profile', icon: User },
        ]
      case 'partner':
        return [
          { name: 'Dashboard', path: '/partner/dashboard', icon: LayoutDashboard },
          { name: 'Profile', path: '/partner/profile', icon: User },
        ]
      case 'admin':
        return [
          { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Users', path: '/admin/users', icon: Users },
          { name: 'Partners', path: '/admin/partners', icon: Recycle },
          { name: 'Service Areas', path: '/admin/service-areas', icon: Map },
        ]
      default:
        return []
    }
  }

  const navLinks = getNavLinks()

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gradient">WasteWise</span>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-400 hover:text-white"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 md:top-0 left-0 h-screen w-64 bg-gray-900 border-r border-gray-800 
        flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:block">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/50">
              <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold text-gradient">WasteWise</span>
          </Link>
        </div>

        <div className="flex-1 px-4 py-6 md:py-0 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname.startsWith(link.path)
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={isActive ? 'nav-link-active' : 'nav-link'}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-all duration-200 font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
