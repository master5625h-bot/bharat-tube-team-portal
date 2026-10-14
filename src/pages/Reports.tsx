import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type Profile } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { Btn, Card, Empty, ErrorMsg, Field, Input, Loading, PageTitle, Textarea } from '../components/ui'

type Rep = { id: string; user_id: string; week_start: string; summary: string; blockers: string; next_plan: string }
type RFile = { id: string; report_id: string; path: string; filename: string; mime: string; size_bytes: number }

const MAX = 5 * 1024 * 1024
const OK = ['image/png', 'application/pdf']
const safe = (n: string) => n.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80)
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

function monday() {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Reports() {
  const { profile } = useAuth()
  const { rows, loading, error, reload } = useTable<Rep>('weekly_reports')
  const files = useTable<RFile>('report_files')
  const team = useTable<Profile>('profiles')
  const [f, setF] = useState({ week_start: monday(), summary: '', blockers: '', next_plan: '' })
  const [picked, setPicked] = useState<File[]>([])
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  function pick(list: FileList | null) {
    setErr('')
    const arr = Array.from(list ?? [])
    const bad = arr.find(x => !OK.includes(x.type) || x.size > MAX)
    if (bad) { setErr(`"${bad.name}" is not allowed. Only PNG or PDF, up to 5 MB each.`); return }
    if (arr.length > 5) { setErr('You can attach up to 5 files.'); return }
    setPicked(arr)
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true)
    const { data, error } = await supabase.from('weekly_reports').insert(f).select('id').single()
    if (error || !data) { setErr(error?.code === '23505' ? 'You already sent a report for that week.' : error?.message ?? 'Failed'); setBusy(false); return }
    const failed: string[] = []
    for (const file of picked) {
      const path = `${profile!.id}/${data.id}/${Date.now()}-${safe(file.name)}`
      const up = await supabase.storage.from('reports').upload(path, file, { contentType: file.type })
      if (up.error) { failed.push(file.name); continue }
      const ins = await supabase.from('report_files').insert({ report_id: data.id, path, filename: file.name, mime: file.type, size_bytes: file.size })
      if (ins.error) failed.push(file.name)
    }
    setBusy(false)
    if (failed.length) setErr(`Report saved, but these files failed: ${failed.join(', ')}`)
    else setOk('Report submitted.')
    setF({ ...f, summary: '', blockers: '', next_plan: '' }); setPicked([]); reload(); files.reload()
  }

  async function open(path: string) {
    const { data, error } = await supabase.storage.from('reports').createSignedUrl(path, 300)
    if (error || !data) setErr(error?.message ?? 'Could not open file'); else window.open(data.signedUrl, '_blank', 'noopener')
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
        <Field label="Attach files (PNG or PDF, up to 5 files, 5 MB each)">
          <input type="file" multiple accept="image/png,application/pdf" onChange={e => pick(e.target.files)}
            className="block min-h-11 w-full rounded-lg border border-neutral-300 bg-white p-2" />
        </Field>
        {picked.length > 0 && <ul className="text-sm text-neutral-700">{picked.map(p => <li key={p.name}>{p.name} ({kb(p.size)})</li>)}</ul>}
        {err && <ErrorMsg msg={err} />}{ok && <p role="status" className="text-green-800">{ok}</p>}
        <Btn disabled={busy}>{busy ? 'Submitting...' : 'Submit report'}</Btn>
      </form></Card>
      {error && <ErrorMsg msg={error} />}
      {loading ? <Loading /> : rows.length === 0 ? <Empty text="No reports yet." /> : (
        <div className="space-y-3">{rows.map(r => (
          <Card key={r.id}><p className="font-semibold">Week of {r.week_start}{profile?.role === 'admin' ? ` · ${who(r.user_id)}` : ''}</p>
            <p className="mt-1 whitespace-pre-wrap">{r.summary}</p>
            {r.blockers && <p className="mt-2 text-sm"><b>Problems:</b> {r.blockers}</p>}
            {r.next_plan && <p className="mt-1 text-sm"><b>Next:</b> {r.next_plan}</p>}
            {files.rows.filter(x => x.report_id === r.id).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.rows.filter(x => x.report_id === r.id).map(x => (
                  <button key={x.id} onClick={() => open(x.path)} className="min-h-11 max-w-full truncate rounded-lg border border-neutral-300 px-3 text-sm underline">
                    {x.mime === 'application/pdf' ? 'PDF' : 'Image'}: {x.filename} ({kb(x.size_bytes)})
                  </button>
                ))}
              </div>
            )}
          </Card>))}</div>
      )}
    </div>
  )
}
