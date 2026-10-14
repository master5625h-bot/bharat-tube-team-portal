import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { Btn, Card, Empty, ErrorMsg, Field, Input, Loading, PageTitle, Select } from '../components/ui'

type R = { id: string; title: string; kind: 'link' | 'file'; url: string | null; file_path: string | null; filename: string | null; mime: string | null; created_at: string }
const OK = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/zip']
const MAX = 10 * 1024 * 1024

export default function Resources() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { rows, loading, error, reload } = useTable<R>('resources')
  const [kind, setKind] = useState<'link' | 'file'>('link')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(e: FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (kind === 'link') {
        if (!/^https?:\/\//i.test(url)) throw new Error('Link http:// ya https:// se shuru hona chahiye.')
        const { error } = await supabase.from('resources').insert({ title, kind, url })
        if (error) throw error
      } else {
        if (!file) throw new Error('File chuno.')
        if (!OK.includes(file.type)) throw new Error('Only PNG, JPG, WEBP, PDF or ZIP allowed.')
        if (file.size > MAX) throw new Error('File 10 MB se chhoti honi chahiye.')
        const path = `${crypto.randomUUID()}/${file.name.replace(/[^\w.\-]+/g, '_')}`
        const up = await supabase.storage.from('resources').upload(path, file, { contentType: file.type })
        if (up.error) throw up.error
        const { error } = await supabase.from('resources').insert({ title, kind, file_path: path, filename: file.name, mime: file.type })
        if (error) { await supabase.storage.from('resources').remove([path]); throw error }
      }
      setTitle(''); setUrl(''); setFile(null); reload()
    } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }
  async function open(r: R) {
    const win = window.open('', '_blank')
    const { data, error } = await supabase.storage.from('resources').createSignedUrl(r.file_path!, 300)
    if (error || !data) { win?.close(); setErr(error?.message ?? 'Could not open file'); return }
    if (win) win.location.href = data.signedUrl; else window.location.href = data.signedUrl
  }
  async function del(r: R) {
    if (r.file_path) await supabase.storage.from('resources').remove([r.file_path])
    await supabase.from('resources').delete().eq('id', r.id); reload()
  }

  return (
    <div>
      <PageTitle>Resources</PageTitle>
      {isAdmin && <Card className="mb-4"><form onSubmit={add} className="space-y-3">
        <Field label="Type"><Select value={kind} onChange={e => setKind(e.target.value as 'link' | 'file')}><option value="link">Link</option><option value="file">File (logo, asset)</option></Select></Field>
        <Field label="Title"><Input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></Field>
        {kind === 'link'
          ? <Field label="URL"><Input type="url" required placeholder="https://" value={url} onChange={e => setUrl(e.target.value)} /></Field>
          : <Field label="File (PNG, JPG, WEBP, PDF, ZIP, max 10 MB)"><input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.zip" className="block w-full min-h-11" onChange={e => setFile(e.target.files?.[0] ?? null)} /></Field>}
        <Btn disabled={busy}>{busy ? 'Saving...' : 'Add resource'}</Btn></form></Card>}
      {(error || err) && <ErrorMsg msg={error || err} />}
      {loading ? <Loading /> : rows.length === 0 ? <Empty text="No resources yet." /> : (
        <div className="space-y-3">{rows.map(r => (
          <Card key={r.id}>
            <p className="text-lg font-semibold">{r.title}</p>
            {r.kind === 'link'
              ? <a className="block min-h-11 break-all py-2 font-semibold text-brand underline" href={r.url!} target="_blank" rel="noopener noreferrer">{r.url}</a>
              : <button className="min-h-11 py-2 text-left font-semibold text-brand underline" onClick={() => open(r)}>Open / download: {r.filename}</button>}
            {isAdmin && <button className="min-h-11 text-red-700 underline" onClick={() => del(r)}>Delete</button>}
          </Card>))}</div>
      )}
    </div>
  )
}
