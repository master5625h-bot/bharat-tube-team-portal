import { useMemo, useState } from 'react'
import { Avatar } from './Avatar'
import { Badge, Card, Select } from './ui'
import type { Profile } from '../lib/supabase'

export type Att = { id: string; user_id: string; day: string; status: string }

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dot: Record<string, string> = { present: 'bg-green-600', absent: 'bg-red-600', leave: 'bg-blue-600' }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function AttendanceCalendar({ rows, people, isAdmin, meId }: {
  rows: Att[]; people: Profile[]; isAdmin: boolean; meId: string
}) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [who, setWho] = useState<string>(isAdmin ? 'all' : meId)
  const [sel, setSel] = useState<string>(iso(new Date()))
  const today = iso(new Date())

  const byDay = useMemo(() => {
    const m = new Map<string, Att[]>()
    rows.filter(r => who === 'all' || r.user_id === who).forEach(r => m.set(r.day, [...(m.get(r.day) ?? []), r]))
    return m
  }, [rows, who])

  const first = (month.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const name = (id: string) => { const p = people.find(x => x.id === id); return p?.full_name || p?.email || 'Member' }
  const dayKey = (d: number) => iso(new Date(month.getFullYear(), month.getMonth(), d))
  const detail = byDay.get(sel) ?? []

  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <button aria-label="Previous month" className="min-h-11 min-w-11 rounded-lg border text-xl" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <h2 className="text-lg font-bold">{month.toLocaleString('en', { month: 'long', year: 'numeric' })}</h2>
        <button aria-label="Next month" className="min-h-11 min-w-11 rounded-lg border text-xl" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
      </div>
      {isAdmin && (
        <div className="mb-3">
          <Select value={who} onChange={e => setWho(e.target.value)} aria-label="Whose attendance">
            <option value="all">Everyone</option>
            {people.filter(p => p.approved).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </Select>
        </div>
      )}
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-neutral-600">{DOW.map(d => <div key={d}>{d}</div>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const k = dayKey(d)
          const list = byDay.get(k) ?? []
          const counts = (s: string) => list.filter(r => r.status === s).length
          return (
            <button key={i} onClick={() => setSel(k)} aria-label={`${k}, ${list.length} records`}
              className={`flex min-h-14 flex-col items-center justify-start rounded-lg border p-1 text-sm ${k === sel ? 'border-brand bg-orange-50' : 'border-neutral-200'} ${k === today ? 'font-bold' : ''}`}>
              <span>{d}</span>
              {who === 'all'
                ? <span className="mt-0.5 flex flex-wrap justify-center gap-x-1 text-xs font-semibold">
                    {counts('present') > 0 && <span className="text-green-700">{counts('present')}</span>}
                    {counts('absent') > 0 && <span className="text-red-700">{counts('absent')}</span>}
                    {counts('leave') > 0 && <span className="text-blue-700">{counts('leave')}</span>}
                  </span>
                : list[0] && <span className={`mt-1 h-3 w-3 rounded-full ${dot[list[0].status]}`} />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-neutral-700">
        <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-green-600 align-middle" />Present</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-red-600 align-middle" />Absent</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-blue-600 align-middle" />Leave</span>
      </p>
      <div className="mt-4 border-t pt-3">
        <h3 className="mb-2 font-bold">{sel}</h3>
        {detail.length === 0 ? <p className="text-neutral-600">No attendance recorded.</p> : detail.map(r => {
          const p = people.find(x => x.id === r.user_id)
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="flex min-w-0 items-center gap-2"><Avatar path={p?.avatar_url} name={name(r.user_id)} size={32} /><span className="truncate">{name(r.user_id)}</span></span>
              <Badge v={r.status} />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
