import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'

export type Msg = { id: string; sender_id: string; kind: 'common' | 'team' | 'dm'; team_id: string | null; recipient_id: string | null; body: string; created_at: string }
type Ctx = {
  msgs: Msg[]; reads: Record<string, string>; unread: Record<string, number>; totalUnread: number
  channelOf: (m: Msg) => string; markRead: (channel: string) => void; reload: () => void; error: string
}
const C = createContext<Ctx>({ msgs: [], reads: {}, unread: {}, totalUnread: 0, channelOf: () => '', markRead: () => {}, reload: () => {}, error: '' })
export const useChat = () => useContext(C)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const me = profile?.id ?? ''
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [reads, setReads] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const channelOf = useCallback((m: Msg) =>
    m.kind === 'common' ? 'common' : m.kind === 'team' ? `team:${m.team_id}` : `dm:${m.sender_id === me ? m.recipient_id : m.sender_id}`, [me])

  const reload = useCallback(async () => {
    if (!me) return
    const [a, b] = await Promise.all([
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('chat_reads').select('channel,last_read_at'),
    ])
    if (a.error) setError(a.error.message); else { setError(''); setMsgs(((a.data ?? []) as Msg[]).reverse()) }
    if (b.data) setReads(Object.fromEntries(b.data.map((r: { channel: string; last_read_at: string }) => [r.channel, r.last_read_at])))
  }, [me])

  useEffect(() => {
    reload()
    // Live updates through Supabase Realtime, plus a slow refresh as a safety net
    const ch = supabase.channel('messages-live').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => reload()).subscribe()
    const t = setInterval(reload, 20000)
    return () => { clearInterval(t); supabase.removeChannel(ch) }
  }, [reload])

  const markRead = useCallback(async (channel: string) => {
    const last = msgs.filter(m => channelOf(m) === channel).map(m => m.created_at).sort().pop() ?? new Date().toISOString()
    setReads(r => (r[channel] && r[channel] >= last ? r : { ...r, [channel]: last }))
    await supabase.from('chat_reads').upsert({ user_id: me, channel, last_read_at: last })
  }, [me, msgs, channelOf])

  const unread = useMemo(() => {
    const u: Record<string, number> = {}
    msgs.forEach(m => {
      if (m.sender_id === me) return
      const ch = channelOf(m)
      if (!reads[ch] || m.created_at > reads[ch]) u[ch] = (u[ch] ?? 0) + 1
    })
    return u
  }, [msgs, reads, me, channelOf])
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)
  return <C.Provider value={{ msgs, reads, unread, totalUnread, channelOf, markRead, reload, error }}>{children}</C.Provider>
}
