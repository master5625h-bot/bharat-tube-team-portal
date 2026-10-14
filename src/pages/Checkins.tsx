import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { usePeople, istToday } from '../lib/people'
import { Avatar } from '../components/Avatar'
import { Btn, Card, Empty, ErrorMsg, Loading, PageTitle, Textarea } from '../components/ui'

type C = { id: string; user_id: string; day: string; note: string; created_at: string }

export default function Checkins() {
  const { profile } = useAuth()
  const { rows, loading, error, reload } = useTable<C>('checkins')
  const { people, name } = usePeople()
  const today = istToday()
  const todays = rows.find(r => r.user_id === profile?.id && r.day === today)
  const [note, setNote] = useState('')
  const [edit, setEdit] = useState(false)
  const [err, setErr] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault(); setErr('')
    const { error } = todays
      ? await supabase.from('checkins').update({ note }).eq('id', todays.id)
      : await supabase.from('checkins').insert({ note })
    if (error) setErr(error.message); else { setNote(''); setEdit(false); reload() }
  }
  async function del(id: string) { await supabase.from('checkins').delete().eq('id', id); reload() }

  return (
    <div>
      <PageTitle>Daily check-in</PageTitle>
      <Card className="mb-4">
        {todays && !edit ? (
          <div><p className="font-semibold">Aaj ka check-in ho gaya ✓</p><p className="whitespace-pre-wrap">{todays.note}</p>
            <button className="min-h-11 underline" onClick={() => { setNote(todays.note); setEdit(true) }}>Edit</button></div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <label className="block"><span className="mb-1 block text-sm font-medium">Aaj ye kiya</span>
              <Textarea required maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Aaj maine..." /></label>
            <Btn>{todays ? 'Update' : 'Post check-in'}</Btn></form>)}
      </Card>
      {(error || err) && <ErrorMsg msg={error || err} />}
      {loading ? <Loading /> : rows.length === 0 ? <Empty text="No check-ins yet." /> : (
        <div className="space-y-3">{rows.map(c => {
          const p = people.find(x => x.id === c.user_id)
          return (
            <Card key={c.id}>
              <div className="mb-1 flex items-center gap-2"><Avatar path={p?.avatar_url} name={name(c.user_id)} size={36} /><p className="font-semibold">{name(c.user_id)}</p>
                <span className="text-sm text-neutral-600">{new Date(c.day + 'T00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span></div>
              <p className="whitespace-pre-wrap">{c.note}</p>
              {(c.user_id === profile?.id || profile?.role === 'admin') && <button className="min-h-11 text-red-700 underline" onClick={() => del(c.id)}>Delete</button>}
            </Card>)
        })}</div>
      )}
    </div>
  )
}
