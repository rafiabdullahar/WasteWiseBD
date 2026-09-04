import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Calendar, Clock, Recycle, Loader2, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../services/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIME_LABELS = {
  morning: '6:00 AM – 12:00 PM',
  afternoon: '12:00 PM – 5:00 PM',
  evening: '5:00 PM – 9:00 PM',
}

const TIME_ICONS = { morning: '🌅', afternoon: '☀️', evening: '🌆' }

const CATEGORY_COLORS = {
  organic: 'badge-green',
  plastic: 'badge-blue',
  paper: 'badge-yellow',
  glass: 'badge-blue',
  metal: 'badge-gray',
  electronic: 'badge-red',
  hazardous: 'badge-red',
}

const ResidentCalendarPage = () => {
  const [schedules, setSchedules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  // Calendar navigation state
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true)
      try {
        const { data } = await api.get('/schedules/my-area')
        setSchedules(data.data.schedules)
      } catch {
        toast.error('Failed to load schedules')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSchedules()
  }, [])

  // Build a map: dayName -> [schedules]
  const schedulesByDay = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter((s) => s.dayOfWeek === day)
    return acc
  }, {})

  // Calendar grid helpers
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  // Get schedules for a specific calendar date
  const getSchedulesForDate = (date) => {
    const dayName = DAYS[new Date(year, month, date).getDay()]
    return schedulesByDay[dayName] || []
  }

  const isToday = (date) =>
    date === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const selectedDaySchedules = selectedDay
    ? getSchedulesForDate(selectedDay)
    : []

  const selectedDayName = selectedDay
    ? DAYS[new Date(year, month, selectedDay).getDay()]
    : null

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Collection Calendar</h1>
        <p className="page-subtitle">View the regular waste collection timetable for your area.</p>
      </div>

      {schedules.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No schedules available</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            No collection schedules have been set up for your area yet, or your addresses are not mapped to a service area. Please update your profile with a valid address.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Calendar */}
          <div className="xl:col-span-2 card">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="btn-ghost p-2">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-white">{monthName}</h2>
              <button onClick={nextMonth} className="btn-ghost p-2">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_SHORT.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Date cells */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((date) => {
                const daySchedules = getSchedulesForDate(date)
                const hasSchedule = daySchedules.length > 0
                const isTodayDate = isToday(date)
                const isSelected = selectedDay === date

                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDay(isSelected ? null : date)}
                    className={`
                      relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 group
                      ${isSelected
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
                        : isTodayDate
                        ? 'bg-brand-950/80 text-brand-400 border border-brand-700/50'
                        : hasSchedule
                        ? 'bg-gray-800/80 text-white hover:bg-gray-700/80'
                        : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800/40'
                      }
                    `}
                  >
                    <span>{date}</span>
                    {hasSchedule && !isSelected && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {daySchedules.slice(0, 3).map((_, idx) => (
                          <span key={idx} className="w-1 h-1 rounded-full bg-brand-400" />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-800 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-brand-600 inline-block" />
                Selected
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-brand-950 border border-brand-700 inline-block" />
                Today
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-brand-400 inline-block" />
                Has collection
              </span>
            </div>
          </div>

          {/* Right: Detail panel + weekly summary */}
          <div className="space-y-4">
            {/* Selected day detail */}
            {selectedDay && (
              <div className="card border-brand-700/40 animate-slide-up">
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-400" />
                  {new Date(year, month, selectedDay).toLocaleDateString('en-US', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </h3>

                {selectedDaySchedules.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">No collection scheduled this day.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDaySchedules.map((s) => (
                      <div key={s._id} className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{TIME_ICONS[s.timeSlot]}</span>
                          <div>
                            <p className="text-sm font-medium text-white capitalize">{s.timeSlot}</p>
                            <p className="text-xs text-gray-400">{TIME_LABELS[s.timeSlot]}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">📍 {s.serviceArea?.name}</p>
                        {s.wasteCategories?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {s.wasteCategories.map((cat) => (
                              <span key={cat} className={`badge ${CATEGORY_COLORS[cat]} capitalize text-xs`}>
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                        {s.description && (
                          <p className="text-xs text-gray-500 mt-2 italic flex items-start gap-1.5">
                            <Info className="w-3 h-3 mt-0.5 shrink-0" />{s.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Weekly summary — always visible */}
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                Weekly Timetable
              </h3>
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const daySlots = schedulesByDay[day]
                  const isTodayDay = DAYS[today.getDay()] === day
                  if (daySlots.length === 0) return null
                  return (
                    <div
                      key={day}
                      className={`p-3 rounded-xl border ${
                        isTodayDay
                          ? 'bg-brand-950/50 border-brand-700/50'
                          : 'bg-gray-800/40 border-gray-700/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-semibold ${isTodayDay ? 'text-brand-400' : 'text-white'}`}>
                          {day} {isTodayDay && <span className="text-xs font-normal text-brand-500">(Today)</span>}
                        </span>
                      </div>
                      {daySlots.map((s) => (
                        <div key={s._id} className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{TIME_ICONS[s.timeSlot]}</span>
                          <span className="capitalize">{s.timeSlot}</span>
                          <span className="text-gray-600">·</span>
                          <span>{s.serviceArea?.name}</span>
                          {s.wasteCategories?.length > 0 && (
                            <span className="flex items-center gap-1 text-brand-500">
                              <Recycle className="w-3 h-3" />
                              {s.wasteCategories.slice(0, 2).join(', ')}
                              {s.wasteCategories.length > 2 && ` +${s.wasteCategories.length - 2}`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}

                {schedules.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No weekly schedules to display.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResidentCalendarPage
