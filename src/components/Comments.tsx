import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type Profile } from '../lib/supabase'
import { Avatar } from './Avatar'
import { Btn, Textarea } from './ui'

export type Comment = { id: string; task_id: string; user_id: string; body: string; created_at: string }

export default function Comments({ taskId, comments, people, onChange }: {
  taskId: string; comments: Comment[]; people: Profile[]; onChange: () => void
}) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = comments.filter(c => c.task_id === taskId).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const who = (id: string) => people.find(p => p.id === id)

  async function send(e: FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.from('task_comments').insert({ task_id: taskId, body: text.trim() })
    setBusy(false)
    if (error) setErr(error.message); else { setText(''); onChange() }
  }
  async function del(id: string) { await supabase.from('task_comments').delete().eq('id', id); onChange() }

  return (
    <div className="mt-3 border-t pt-3">
      <button className="min-h-11 font-medium underline" onClick={() => setOpen(!open)}>
        {open ? 'Hide comments' : `Comments (${mine.length})`}
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {mine.length === 0 && <p className="text-neutral-600">No comments yet.</p>}
          {mine.map(c => {
            const a = who(c.user_id)
            const n = a?.full_name || a?.email || 'Unknown'
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar path={a?.avatar_url} name={n} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-600"><b className="text-neutral-900">{n}</b> · {new Date(c.created_at).toLocaleString()}</p>
                  <p className="whitespace-pre-wrap break-words">{c.body}</p>
                  {(profile?.role === 'admin' || c.user_id === profile?.id) && (
                    <button className="min-h-11 text-sm text-red-700 underline" onClick={() => del(c.id)}>Delete</button>
                  )}
                </div>
              </div>
            )
          })}
          <form onSubmit={send} className="space-y-2">
            <Textarea required maxLength={2000} placeholder="Write a comment" value={text} onChange={e => setText(e.target.value)} />
            {err && <p role="alert" className="text-red-700">{err}</p>}
            <Btn disabled={busy || !text.trim()}>{busy ? 'Sending...' : 'Post comment'}</Btn>
          </form>
        </div>
      )}
    </div>
  )
}
