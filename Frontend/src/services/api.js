import axios from 'axios'

// Central Axios instance. All components import from here — never create
// ad-hoc axios calls in components.
const api = axios.create({
  baseURL: '/api',           // proxied to :5001 in dev via vite.config.js
  withCredentials: true,     // send the httpOnly cookie automatically
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT from localStorage as Bearer header.
// The server accepts either the httpOnly cookie or the Authorization header.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wwbd_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: clear auth state and redirect to /login on 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wwbd_token')
      localStorage.removeItem('wwbd_user')
      // Avoid infinite redirect loop on the login page itself.
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
