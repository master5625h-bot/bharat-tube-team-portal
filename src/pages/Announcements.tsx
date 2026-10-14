import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { useOnce } from '../lib/people'
import { Btn, Card, Empty, ErrorMsg, Field, Input, Loading, PageTitle, Textarea } from '../components/ui'

type Ann = { id: string; title: string; body: string; created_at: string }

export default function Announcements() {
  const { profile } = useAuth()
  const { rows, loading, error, reload } = useTable<Ann>('announcements')
  const [f, setF] = useState({ title: '', body: '' })
  const [err, setErr] = useState('')
  const once = useOnce()
  const add = (e: FormEvent) => { e.preventDefault(); return once(async () => {
    setErr('')
    const { error } = await supabase.from('announcements').insert(f)
    if (error) setErr(error.message); else { setF({ title: '', body: '' }); reload() }
  }) }
  async function del(id: string) { await supabase.from('announcements').delete().eq('id', id); reload() }
  return (
    <div>
      <PageTitle>Announcements</PageTitle>
      {profile?.role === 'admin' && <Card className="mb-4"><form onSubmit={add} className="space-y-3">
        <Field label="Title"><Input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Message"><Textarea required value={f.body} onChange={e => setF({ ...f, body: e.target.value })} /></Field>
        <Btn>Post</Btn></form></Card>}
      {(error || err) && <ErrorMsg msg={error || err} />}
      {loading ? <Loading /> : rows.length === 0 ? <Empty text="No announcements yet." /> : (
        <div className="space-y-3">{rows.map(a => (
          <Card key={a.id}><p className="text-lg font-semibold">{a.title}</p><p className="whitespace-pre-wrap">{a.body}</p>
            <p className="mt-2 text-sm text-neutral-600">{new Date(a.created_at).toLocaleDateString()}</p>
            {profile?.role === 'admin' && <button className="mt-2 min-h-11 text-red-700 underline" onClick={() => del(a.id)}>Delete</button>}</Card>))}</div>
      )}
    </div>
  )
}
