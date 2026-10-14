import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { useOnce } from '../lib/people'
import { Btn, Card, Empty, ErrorMsg, Field, Input, Loading, PageTitle } from '../components/ui'

type Poll = { id: string; question: string; closed: boolean; created_at: string }
type Opt = { id: string; poll_id: string; label: string; position: number }
type Res = { poll_id: string; option_id: string; votes: number }
type MyVote = { poll_id: string; option_id: string }

export default function Polls() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const polls = useTable<Poll>('polls')
  const opts = useTable<Opt>('poll_options', '*', 'position', true)
  const mine = useTable<MyVote>('poll_votes', '*', 'created_at')
  const [res, setRes] = useState<Res[]>([])
  const [q, setQ] = useState('')
  const [o, setO] = useState(['', ''])
  const [err, setErr] = useState('')
  const loadRes = useCallback(async () => {
    const { data, error } = await supabase.rpc('poll_results')
    if (error) setErr(error.message); else setRes(((data ?? []) as Res[]).map(r => ({ ...r, votes: Number(r.votes) })))
  }, [])
  useEffect(() => { loadRes() }, [loadRes])
  const refresh = () => { polls.reload(); opts.reload(); mine.reload(); loadRes() }

  const once = useOnce()
  const create = (e: FormEvent) => { e.preventDefault(); return once(async () => {
    setErr('')
    const { error } = await supabase.rpc('create_poll', { q, opts: o.map(x => x.trim()).filter(Boolean) })
    if (error) setErr(error.message); else { setQ(''); setO(['', '']); refresh() }
  }) }
  const vote = (poll_id: string, option_id: string) => once(async () => {
    setErr('')
    const { error } = await supabase.from('poll_votes').insert({ poll_id, option_id })
    if (error) setErr(error.code === '23505' ? 'Aap is poll me vote kar chuke ho.' : error.message); refresh()
  })
  async function setClosed(id: string, closed: boolean) { await supabase.from('polls').update({ closed }).eq('id', id); refresh() }
  async function del(id: string) { await supabase.from('polls').delete().eq('id', id); refresh() }

  return (
    <div>
      <PageTitle>Polls</PageTitle>
      {isAdmin && <Card className="mb-4"><form onSubmit={create} className="space-y-3">
        <Field label="Question"><Input required maxLength={200} value={q} onChange={e => setQ(e.target.value)} /></Field>
        {o.map((v, i) => <Field key={i} label={`Option ${i + 1}`}><Input maxLength={100} value={v} onChange={e => setO(o.map((x, j) => j === i ? e.target.value : x))} /></Field>)}
        <div className="flex gap-2">
          {o.length < 5 && <Btn type="button" className="bg-black hover:bg-neutral-800" onClick={() => setO([...o, ''])}>+ Option</Btn>}
          <Btn>Create poll</Btn></div></form></Card>}
      {(polls.error || opts.error || err) && <ErrorMsg msg={polls.error || opts.error || err} />}
      {polls.loading ? <Loading /> : polls.rows.length === 0 ? <Empty text="No polls yet." /> : (
        <div className="space-y-3">{polls.rows.map(p => {
          const my = mine.rows.find(v => v.poll_id === p.id)
          const os = opts.rows.filter(x => x.poll_id === p.id)
          const total = res.filter(r => r.poll_id === p.id).reduce((s, r) => s + r.votes, 0)
          const showResults = Boolean(my) || p.closed
          return (
            <Card key={p.id}>
              <p className="text-lg font-semibold">{p.question} {p.closed && <span className="ml-1 rounded-full bg-neutral-200 px-2 py-0.5 text-sm font-normal">Closed</span>}</p>
              <div className="mt-2 space-y-2">{os.map(op => {
                const n = res.find(r => r.option_id === op.id)?.votes ?? 0
                const pct = total ? Math.round(n * 100 / total) : 0
                return showResults ? (
                  <div key={op.id} className={`relative overflow-hidden rounded-xl border ${my?.option_id === op.id ? 'border-brand' : 'border-neutral-200'}`}>
                    <div className="absolute inset-y-0 left-0 bg-red-100" style={{ width: `${pct}%` }} />
                    <p className="relative flex min-h-11 items-center justify-between px-3"><span>{op.label}{my?.option_id === op.id ? ' ✓' : ''}</span><span className="font-semibold">{n} ({pct}%)</span></p>
                  </div>
                ) : <button key={op.id} onClick={() => vote(p.id, op.id)} className="min-h-11 w-full rounded-xl border border-neutral-200 px-3 text-left font-medium hover:bg-neutral-50">{op.label}</button>
              })}</div>
              <p className="mt-2 text-sm text-neutral-600">{total} vote{total === 1 ? '' : 's'}{!showResults && ' · vote karne ke baad results dikhenge'}</p>
              {isAdmin && <div className="mt-2 flex gap-4">
                <button className="min-h-11 underline" onClick={() => setClosed(p.id, !p.closed)}>{p.closed ? 'Reopen' : 'Close poll'}</button>
                <button className="min-h-11 text-red-700 underline" onClick={() => del(p.id)}>Delete</button></div>}
            </Card>)
        })}</div>
      )}
    </div>
  )
}
