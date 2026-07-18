import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Recycle, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'

const ResidentGuidelinesPage = () => {
  const [guidelines, setGuidelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const fetchGuidelines = async () => {
      try {
        const { data } = await api.get('/guidelines')
        if (data.success) setGuidelines(data.data.guidelines)
      } catch {
        toast.error('Could not load disposal guidelines')
      } finally {
        setLoading(false)
      }
    }
    fetchGuidelines()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Waste Disposal Guidelines</h1>
        <p className="text-gray-400">How to prepare each type of waste before collection.</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid gap-4">
          {guidelines.map((g) => {
            const isOpen = expanded === g._id
            return (
              <div key={g._id} className="card-glass">
                <button
                  onClick={() => setExpanded(isOpen ? null : g._id)}
                  className="w-full flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center">
                      <Recycle className="w-5 h-5 text-brand-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold">{g.title}</p>
                      <p className="text-xs text-gray-500">
                        {g.isRecyclable ? 'Recyclable' : 'Not recyclable'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                    <p className="text-gray-300 text-sm">{g.instructions}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">DO</p>
                        <ul className="space-y-2">
                          {g.doList.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">DON'T</p>
                        <ul className="space-y-2">
                          {g.dontList.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ResidentGuidelinesPage