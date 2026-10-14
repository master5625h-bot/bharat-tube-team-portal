import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { usePeople } from '../lib/people'
import { Btn, Card, Empty, ErrorMsg, Field, Input, Loading, PageTitle, Select } from '../components/ui'

type Item = { id: string; title: string; publish_date: string; platform: string; note: string; assigned_to: string | null; created_by: string }
const PLATFORMS = ['YouTube', 'Shorts', 'Instagram', 'Facebook', 'Other']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ContentCalendar() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { rows, loading, error, reload } = useTable<Item>('content_items', '*', 'publish_date')
  const { people, name } = usePeople()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [sel, setSel] = useState(iso(new Date()))
  const [f, setF] = useState({ title: '', platform: 'YouTube', note: '', assigned_to: '' })
  const [err, setErr] = useState('')
  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>(); rows.forEach(r => m.set(r.publish_date, [...(m.get(r.publish_date) ?? []), r])); return m
  }, [rows])
  const first = (month.getDay() + 6) % 7
  const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  const key = (d: number) => iso(new Date(month.getFullYear(), month.getMonth(), d))
  const today = iso(new Date())

  async function add(e: FormEvent) {
    e.preventDefault(); setErr('')
    const { error } = await supabase.from('content_items').insert({
      title: f.title, platform: f.platform, note: f.note, publish_date: sel,
      assigned_to: isAdmin ? (f.assigned_to || null) : profile!.id,
    })
    if (error) setErr(error.message); else { setF({ title: '', platform: 'YouTube', note: '', assigned_to: '' }); reload() }
  }
  async function del(id: string) { await supabase.from('content_items').delete().eq('id', id); reload() }

  return (
    <div>
      <PageTitle>Content calendar</PageTitle>
      {(error || err) && <ErrorMsg msg={error || err} />}
      {loading ? <Loading /> : <>
        <Card className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <button aria-label="Previous month" className="min-h-11 min-w-11 rounded-lg border text-xl" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
            <h2 className="text-lg font-bold">{month.toLocaleString('en', { month: 'long', year: 'numeric' })}</h2>
            <button aria-label="Next month" className="min-h-11 min-w-11 rounded-lg border text-xl" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {DOW.map(d => <div key={d} className="font-medium text-neutral-600">{d}</div>)}
            {cells.map((d, i) => d === null ? <div key={i} /> : (
              <button key={i} onClick={() => setSel(key(d))} aria-label={`${key(d)}, ${(byDay.get(key(d)) ?? []).length} planned`}
                className={`min-h-12 rounded-lg border p-1 ${key(d) === sel ? 'border-brand bg-red-50' : 'border-neutral-200'} ${key(d) === today ? 'font-bold' : ''}`}>
                <div>{d}</div>
                {(byDay.get(key(d)) ?? []).length > 0 && <div className="mx-auto mt-0.5 h-2 w-2 rounded-full bg-brand" />}
              </button>))}
          </div>
        </Card>
        <Card className="mb-4">
          <h2 className="mb-2 text-lg font-bold">{new Date(sel + 'T00:00').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {(byDay.get(sel) ?? []).length === 0 ? <Empty text="Is din kuch planned nahi hai." /> : (byDay.get(sel) ?? []).map(it => (
            <div key={it.id} className="border-b py-2 last:border-0">
              <p className="font-semibold">{it.title} <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-sm font-normal">{it.platform}</span></p>
              {it.note && <p>{it.note}</p>}
              {it.assigned_to && <p className="text-sm text-neutral-600">Assigned: {name(it.assigned_to)}</p>}
              {(isAdmin || it.created_by === profile?.id) && <button className="min-h-11 text-red-700 underline" onClick={() => del(it.id)}>Delete</button>}
            </div>))}
        </Card>
        <Card><h2 className="mb-2 text-lg font-bold">Add video on {sel}</h2>
          <form onSubmit={add} className="space-y-3">
            <Field label="Video title"><Input required maxLength={150} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Platform"><Select value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</Select></Field>
            {isAdmin && <Field label="Assigned to (optional)"><Select value={f.assigned_to} onChange={e => setF({ ...f, assigned_to: e.target.value })}>
              <option value="">Nobody</option>{people.filter(p => p.approved).map(p => <option key={p.id} value={p.id}>{name(p.id)}</option>)}</Select></Field>}
            <Field label="Note (optional)"><Input maxLength={500} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></Field>
            <Btn>Add to calendar</Btn></form></Card>
      </>}
    </div>
  )
}
