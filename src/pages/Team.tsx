import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type Profile } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { Avatar } from '../components/Avatar'
import AvatarUpload from '../components/AvatarUpload'
import { Badge, Btn, Card, Empty, ErrorMsg, Loading, PageTitle } from '../components/ui'

export default function Team() {
  const { profile } = useAuth()
  const { rows, loading, error, reload } = useTable<Profile>('profiles')
  const [err, setErr] = useState('')
  const isAdmin = profile?.role === 'admin'
  async function patch(id: string, p: Partial<Profile>) {
    const { error } = await supabase.from('profiles').update(p).eq('id', id)
    if (error) setErr(error.message); else reload()
  }
  return (
    <div>
      <PageTitle>Team</PageTitle>
      <AvatarUpload onDone={reload} />
      {(error || err) && <ErrorMsg msg={error || err} />}
      {loading ? <Loading /> : rows.length === 0 ? <Empty text="No members." /> : (
        <div className="space-y-3">{rows.map(p => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><Avatar path={p.avatar_url} name={p.full_name || p.email} /><div><p className="font-semibold">{p.full_name || '(no name)'}</p><p className="break-all text-sm text-neutral-600">{p.email}</p></div></div>
              <div className="flex gap-2"><Badge v={p.role} />{!p.approved && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm text-amber-900">pending</span>}</div></div>
            {isAdmin && p.id !== profile?.id && <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={() => patch(p.id, { approved: !p.approved })}>{p.approved ? 'Remove access' : 'Approve'}</Btn>
              <Btn className="bg-black hover:bg-neutral-800" onClick={() => patch(p.id, { role: p.role === 'admin' ? 'member' : 'admin' })}>Make {p.role === 'admin' ? 'member' : 'admin'}</Btn></div>}
          </Card>))}</div>
      )}
    </div>
  )
}
