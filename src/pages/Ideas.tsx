import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { usePeople, useOnce } from '../lib/people'
import { Btn, Card, Empty, ErrorMsg, Field, Input, Loading, PageTitle, Select, Textarea } from '../components/ui'

type Idea = { id: string; title: string; description: string; status: string; created_by: string; created_at: string }
type Vote = { idea_id: string; user_id: string }
const STATUSES = ['new', 'under review', 'accepted', 'rejected']
const tone: Record<string, string> = { new: 'bg-neutral-100 text-neutral-800', 'under review': 'bg-amber-100 text-amber-900', accepted: 'bg-green-100 text-green-900', rejected: 'bg-red-100 text-red-900' }

export default function Ideas() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const ideas = useTable<Idea>('ideas')
  const votes = useTable<Vote>('idea_votes', '*', 'created_at')
  const { name } = usePeople()
  const [f, setF] = useState({ title: '', description: '' })
  const [err, setErr] = useState('')
  const count = (id: string) => votes.rows.filter(v => v.idea_id === id).length
  const mine = (id: string) => votes.rows.some(v => v.idea_id === id && v.user_id === profile?.id)
  const sorted = [...ideas.rows].sort((a, b) => count(b.id) - count(a.id) || +new Date(b.created_at) - +new Date(a.created_at))

  const once = useOnce()
  const add = (e: FormEvent) => { e.preventDefault(); return once(async () => {
    setErr('')
    const { error } = await supabase.from('ideas').insert({ title: f.title.trim(), description: f.description.trim() })
    if (error) setErr(error.message); else { setF({ title: '', description: '' }); ideas.reload() }
  }) }
  const toggle = (id: string) => once(async () => {
    setErr('')
    const q = mine(id)
      ? supabase.from('idea_votes').delete().eq('idea_id', id).eq('user_id', profile!.id)
      : supabase.from('idea_votes').insert({ idea_id: id })
    const { error } = await q
    if (error) setErr(error.message); votes.reload()
  })
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from('ideas').update({ status }).eq('id', id)
    if (error) setErr(error.message); ideas.reload()
  }
  async function del(id: string) { await supabase.from('ideas').delete().eq('id', id); ideas.reload(); votes.reload() }

  return (
    <div>
      <PageTitle>Idea box</PageTitle>
      <Card className="mb-4"><form onSubmit={add} className="space-y-3">
        <Field label="Idea title"><Input required maxLength={120} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Short description"><Textarea maxLength={1000} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
        <Btn>Post idea</Btn></form></Card>
      {(ideas.error || votes.error || err) && <ErrorMsg msg={ideas.error || votes.error || err} />}
      {ideas.loading ? <Loading /> : sorted.length === 0 ? <Empty text="No ideas yet. Pehla idea aap daalo!" /> : (
        <div className="space-y-3">{sorted.map(i => (
          <Card key={i.id}>
            <div className="flex items-start gap-3">
              <button aria-label={mine(i.id) ? 'Remove vote' : 'Vote'} onClick={() => toggle(i.id)}
                className={`flex min-h-14 min-w-14 flex-col items-center justify-center rounded-xl border-2 font-bold ${mine(i.id) ? 'border-brand bg-brand text-white' : 'border-neutral-200'}`}>
                <span>▲</span><span>{count(i.id)}</span></button>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{i.title}</p>
                {i.description && <p className="whitespace-pre-wrap">{i.description}</p>}
                <p className="mt-1 text-sm text-neutral-600">by {name(i.created_by)} · {new Date(i.created_at).toLocaleDateString()}</p>
                <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-sm font-medium ${tone[i.status]}`}>{i.status}</span>
              </div>
            </div>
            {isAdmin && <div className="mt-3 flex items-center gap-3">
              <div className="flex-1"><Select aria-label="Idea status" value={i.status} onChange={e => setStatus(i.id, e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</Select></div>
              <button className="min-h-11 text-red-700 underline" onClick={() => del(i.id)}>Delete</button></div>}
            {!isAdmin && i.created_by === profile?.id && <button className="mt-2 min-h-11 text-red-700 underline" onClick={() => del(i.id)}>Delete</button>}
          </Card>))}</div>
      )}
    </div>
  )
}
