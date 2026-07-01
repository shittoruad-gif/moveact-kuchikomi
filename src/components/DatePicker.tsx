import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  value: string // 'YYYY-MM-DD'
  onChange: (value: string) => void
  max?: string // 'YYYY-MM-DD'
  min?: string // 'YYYY-MM-DD'
  placeholder?: string
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateStr(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function formatDisplay(s: string): string {
  const d = parseDateStr(s)
  if (!d) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function DatePicker({ value, onChange, max, min, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseDateStr(value)
  const maxDate = parseDateStr(max || '')
  const minDate = parseDateStr(min || '')
  const [viewDate, setViewDate] = useState(() => selected ?? maxDate ?? new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const isDisabled = (d: Date) => {
    if (maxDate && d > maxDate) return true
    if (minDate && d < minDate) return true
    return false
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const today = new Date()

  const handlePick = (d: Date) => {
    if (isDisabled(d)) return
    onChange(toDateStr(d))
    setOpen(false)
  }

  const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const goNextMonth = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full max-w-xs bg-white hover:border-primary transition-colors"
      >
        <Calendar className="w-4 h-4 text-primary shrink-0" />
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value ? formatDisplay(value) : placeholder || '日付を選択'}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-72">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100"
              aria-label="前の月"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="font-medium text-gray-800 text-sm">
              {year}年{month + 1}月
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100"
              aria-label="次の月"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs text-gray-400 font-medium py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const disabled = isDisabled(d)
              const isSelected = selected && isSameDay(d, selected)
              const isToday = isSameDay(d, today)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePick(d)}
                  className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-colors ${
                    disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : isSelected
                        ? 'bg-primary text-white font-bold'
                        : isToday
                          ? 'border border-primary text-primary font-medium hover:bg-primary/5'
                          : 'text-gray-700 hover:bg-primary/5'
                  }`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isDisabled(today)) handlePick(today)
            }}
            disabled={isDisabled(today)}
            className="w-full mt-3 text-xs text-primary font-medium hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
          >
            今日を選択
          </button>
        </div>
      )}
    </div>
  )
}
