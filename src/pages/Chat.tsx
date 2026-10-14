import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase, type Team } from '../lib/supabase'
import { useChat, type Msg } from '../lib/chat'
import { usePeople, useOnce } from '../lib/people'
import { useTable } from '../lib/useTable'
import { Avatar } from '../components/Avatar'
import { Card, ErrorMsg, PageTitle } from '../components/ui'

const time = (iso: string) => {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
}
const dayLabel = (iso: string) => {
  const d = new Date(iso), now = new Date(), y = new Date(Date.now() - 864e5)
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
}

function Badge({ n }: { n: number }) {
  return n > 0 ? <span className="ig-bg inline-flex min-h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm font-bold text-white">{n > 99 ? '99+' : n}</span> : null
}

function Row({ to, left, title, sub, at, n }: { to: string; left: React.ReactNode; title: string; sub: string; at?: string; n: number }) {
  return (
    <Link to={to} className="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2 active:bg-neutral-100">
      {left}
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${n ? 'font-extrabold' : 'font-semibold'}`}>{title}</span>
        <span className={`block truncate text-sm ${n ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>{sub}</span>
      </span>
      <span className="flex flex-col items-end gap-1"><span className="text-sm text-neutral-600">{at ? time(at) : ''}</span><Badge n={n} /></span>
    </Link>
  )
}
const Icon = ({ c }: { c: string }) => <span className="ig-ring inline-flex shrink-0 rounded-full p-[2px]"><span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-lg text-white" aria-hidden>{c}</span></span>

export function ChatList() {
  const { profile } = useAuth()
  const { msgs, unread, channelOf, error } = useChat()
  const { people, name } = usePeople()
  const teams = useTable<Team>('teams', '*', 'name', true)
  const [picking, setPicking] = useState(false)
  const nav = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const me = profile?.id
  const last = (ch: string) => [...msgs].reverse().find(m => channelOf(m) === ch)
  const preview = (m?: Msg) => m ? `${m.sender_id === me ? 'You' : name(m.sender_id).split(' ')[0]}: ${m.body}` : 'No messages yet'
  const myTeams = teams.rows.filter(t => isAdmin || t.id === profile?.team_id)
  const dmIds = useMemo(() => {
    const ids = new Set<string>()
    msgs.filter(m => m.kind === 'dm').forEach(m => ids.add(m.sender_id === me ? m.recipient_id! : m.sender_id))
    return [...ids].sort((a, b) => (last(`dm:${b}`)?.created_at ?? '').localeCompare(last(`dm:${a}`)?.created_at ?? ''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, me])
  const others = people.filter(p => p.approved && p.id !== me)

  return (
    <div>
      <PageTitle>Chat</PageTitle>
      {error && <ErrorMsg msg={error} />}
      <Card className="mb-4">
        <p className="mb-1 px-2 text-sm font-semibold text-neutral-600">Channels</p>
        <Row to="/chat/common" left={<Icon c="💬" />} title="Everyone" sub={preview(last('common'))} at={last('common')?.created_at} n={unread['common'] ?? 0} />
        {myTeams.map(t => <Row key={t.id} to={`/chat/team-${t.id}`} left={<Icon c="👥" />} title={`${t.name} team`} sub={preview(last(`team:${t.id}`))} at={last(`team:${t.id}`)?.created_at} n={unread[`team:${t.id}`] ?? 0} />)}
        {!isAdmin && !profile?.team_id && <p className="px-2 py-2 text-sm text-neutral-600">Team channel tab dikhega jab admin aapko team assign karega.</p>}
      </Card>
      <Card>
        <div className="mb-1 flex items-center justify-between px-2"><p className="text-sm font-semibold text-neutral-600">Direct messages</p>
          <button className="min-h-11 font-semibold text-brand" onClick={() => setPicking(!picking)}>{picking ? 'Close' : '+ New'}</button></div>
        {picking && <div className="mb-2 rounded-2xl bg-neutral-50 p-1">{others.length === 0 ? <p className="p-3 text-neutral-600">Koi aur member nahi mila.</p> : others.map(p => (
          <button key={p.id} onClick={() => nav(`/chat/dm-${p.id}`)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left active:bg-neutral-100">
            <Avatar path={p.avatar_url} name={name(p.id)} size={36} /><span className="font-semibold">{name(p.id)}</span></button>))}</div>}
        {dmIds.length === 0 && !picking && <p className="px-2 py-3 text-neutral-600">Abhi koi DM nahi. "+ New" dabao.</p>}
        {dmIds.map(id => {
          const p = people.find(x => x.id === id), l = last(`dm:${id}`)
          return <Row key={id} to={`/chat/dm-${id}`} left={<Avatar path={p?.avatar_url} name={name(id)} size={44} />} title={name(id)} sub={preview(l)} at={l?.created_at} n={unread[`dm:${id}`] ?? 0} />
        })}
      </Card>
    </div>
  )
}

export function ChatRoom() {
  const { key = 'common' } = useParams()
  const { profile } = useAuth()
  const { msgs, channelOf, markRead, reload } = useChat()
  const { people, name } = usePeople()
  const teams = useTable<Team>('teams', '*', 'name', true)
  const me = profile?.id ?? ''
  const channel = key === 'common' ? 'common' : key.startsWith('team-') ? `team:${key.slice(5)}` : `dm:${key.slice(3)}`
  const list = msgs.filter(m => channelOf(m) === channel)
  const dmPerson = channel.startsWith('dm:') ? people.find(p => p.id === channel.slice(3)) : undefined
  const title = channel === 'common' ? 'Everyone' : channel.startsWith('team:') ? `${teams.rows.find(t => t.id === channel.slice(5))?.name ?? 'Team'} team` : name(channel.slice(3))
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const lastAt = list[list.length - 1]?.created_at

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [list.length])
  useEffect(() => { if (lastAt) markRead(channel) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, lastAt])

  const once = useOnce()
  const send = (e: FormEvent) => { e.preventDefault(); return once(async () => {
    const body = text.trim(); if (!body) return
    setBusy(true); setErr('')
    const row: Record<string, string> = channel === 'common' ? { kind: 'common', body }
      : channel.startsWith('team:') ? { kind: 'team', team_id: channel.slice(5), body }
      : { kind: 'dm', recipient_id: channel.slice(3), body }
    const { error } = await supabase.from('messages').insert(row)
    if (error) setErr(error.message); else { setText(''); await reload() }
    setBusy(false)
  }) }

  let prevDay = ''
  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100dvh-7.5rem)] flex-col md:mx-0 md:mt-0 md:h-[calc(100dvh-4rem)]">
      <div className="flex items-center gap-3 border-b bg-white px-3 py-2">
        <Link to="/chat" aria-label="Back to chats" className="flex min-h-11 min-w-11 items-center justify-center text-2xl">‹</Link>
        {dmPerson ? <Avatar path={dmPerson.avatar_url} name={title} size={36} /> : <span aria-hidden className="text-2xl">{channel === 'common' ? '💬' : '👥'}</span>}
        <p className="truncate text-lg font-extrabold">{title}</p>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto bg-white px-3 py-3">
        {list.length === 0 && <p className="mt-10 text-center text-neutral-600">Abhi koi message nahi. Pehla message bhejo 👋</p>}
        {list.map(m => {
          const mine = m.sender_id === me
          const d = dayLabel(m.created_at); const showDay = d !== prevDay; prevDay = d
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-sm text-neutral-500">{d}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-3xl px-4 py-2 ${mine ? 'ig-bg rounded-br-lg text-white' : 'rounded-bl-lg bg-neutral-100 text-neutral-900'}`}>
                  {!mine && !channel.startsWith('dm:') && <p className="text-sm font-bold text-brand">{name(m.sender_id)}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-right text-xs ${mine ? 'text-white/80' : 'text-neutral-500'}`}>{time(m.created_at)}</p>
                </div>
              </div>
            </div>)
        })}
        <div ref={end} />
      </div>
      {err && <div className="px-3"><ErrorMsg msg={err} /></div>}
      <form onSubmit={send} className="flex items-end gap-2 border-t bg-white p-3 pb-16 md:pb-3">
        <textarea aria-label="Message" rows={1} maxLength={2000} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
          placeholder="Message..." className="max-h-32 min-h-12 flex-1 resize-none rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-3" />
        <button disabled={busy || !text.trim()} className="ig-bg min-h-12 rounded-full px-5 font-bold text-white disabled:opacity-40">Send</button>
      </form>
    </div>
  )
}
