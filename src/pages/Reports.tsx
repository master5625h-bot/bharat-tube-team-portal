import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type Profile } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { Btn, Card, Empty, ErrorMsg, Field, Input, Loading, PageTitle, Textarea } from '../components/ui'

type Rep = { id: string; user_id: string; week_start: string; summary: string; blockers: string; next_plan: string }

function monday() {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export default function Reports() {
  const { profile } = useAuth()
  const { rows, loading, error, reload } = useTable<Rep>('weekly_reports')
  const team = useTable<Profile>('profiles')
  const [f, setF] = useState({ week_start: monday(), summary: '', blockers: '', next_plan: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setOk('')
    const { error } = await supabase.from('weekly_reports').insert(f)
    if (error) setErr(error.code === '23505' ? 'You already sent a report for that week.' : error.message)
    else { setOk('Report submitted.'); setF({ ...f, summary: '', blockers: '', next_plan: '' }); reload() }
  }
  const who = (id: string) => team.rows.find(p => p.id === id)?.full_name || team.rows.find(p => p.id === id)?.email || ''
  return (
    <div>
      <PageTitle>Weekly reports</PageTitle>
      <Card className="mb-4"><form onSubmit={submit} className="space-y-3">
        <Field label="Week starting"><Input type="date" required value={f.week_start} onChange={e => setF({ ...f, week_start: e.target.value })} /></Field>
        <Field label="What did you do?"><Textarea required value={f.summary} onChange={e => setF({ ...f, summary: e.target.value })} /></Field>
        <Field label="Problems"><Textarea value={f.blockers} onChange={e => setF({ ...f, blockers: e.target.value })} /></Field>
        <Field label="Plan for next week"><Textarea value={f.next_plan} onChange={e => setF({ ...f, next_plan: e.target.value })} /></Field>
        {err && <ErrorMsg msg={err} />}{ok && <p role="status" className="text-green-800">{ok}</p>}
        <Btn>Submit report</Btn>
      </form></Card>
      {error && <ErrorMsg msg={error} />}
      {loading ? <Loading /> : rows.length === 0 ? <Empty text="No reports yet." /> : (
        <div className="space-y-3">{rows.map(r => (
          <Card key={r.id}><p className="font-semibold">Week of {r.week_start}{profile?.role === 'admin' ? ` · ${who(r.user_id)}` : ''}</p>
            <p className="mt-1 whitespace-pre-wrap">{r.summary}</p>
            {r.blockers && <p className="mt-2 text-sm"><b>Problems:</b> {r.blockers}</p>}
            {r.next_plan && <p className="mt-1 text-sm"><b>Next:</b> {r.next_plan}</p>}</Card>))}</div>
      )}
    </div>
  )
}
