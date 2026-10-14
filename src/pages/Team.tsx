import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type Profile, type Team } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { Avatar } from '../components/Avatar'
import AvatarUpload from '../components/AvatarUpload'
import { Badge, Btn, Card, Empty, ErrorMsg, Input, Loading, PageTitle, Select } from '../components/ui'

type Task = { id: string; title: string; status: string; assigned_to: string | null; due_date: string | null }
type Att = { id: string; user_id: string; day: string; status: string }

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function TeamPage() {
  const { profile } = useAuth()
  const people = useTable<Profile>('profiles')
  const teams = useTable<Team>('teams')
  const tasks = useTable<Task>('tasks')
  const att = useTable<Att>('attendance', '*', 'day')
  const [err, setErr] = useState('')
  const [sel, setSel] = useState<string>('all') // 'all' | 'none' | team id
  const [newTeam, setNewTeam] = useState('')
  const isAdmin = profile?.role === 'admin'
  const loading = people.loading || teams.loading

  async function patch(id: string, p: Partial<Profile>) {
    const { error } = await supabase.from('profiles').update(p).eq('id', id)
    if (error) setErr(error.message); else people.reload()
  }
  async function addTeam(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('teams').insert({ name: newTeam.trim() })
    if (error) setErr(error.message); else { setNewTeam(''); teams.reload() }
  }

  const sortedTeams = [...teams.rows].sort((a, b) => a.name.localeCompare(b.name))
  const teamName = (id: string | null) => teams.rows.find(t => t.id === id)?.name
  const shown = people.rows.filter(p => sel === 'all' || (sel === 'none' ? !p.team_id : p.team_id === sel))
  const t0 = today()
  const month = t0.slice(0, 7)

  const chip = (id: string, label: string, n: number) => (
    <button key={id} onClick={() => setSel(id)} aria-pressed={sel === id}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${sel === id ? 'border-brand bg-brand text-white' : 'border-neutral-200 bg-white'}`}>
      {label} ({n})
    </button>
  )

  return (
    <div>
      <PageTitle>Team</PageTitle>
      <AvatarUpload onDone={people.reload} />
      {(people.error || teams.error || err) && <ErrorMsg msg={people.error || teams.error || err} />}
      {loading ? <Loading /> : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {chip('all', 'All', people.rows.length)}
            {sortedTeams.map(t => chip(t.id, t.name, people.rows.filter(p => p.team_id === t.id).length))}
            {chip('none', 'No team', people.rows.filter(p => !p.team_id).length)}
          </div>
          {isAdmin && (
            <form onSubmit={addTeam} className="mb-4 flex gap-2">
              <Input required maxLength={40} placeholder="New team name" value={newTeam} onChange={e => setNewTeam(e.target.value)} />
              <Btn>Add team</Btn>
            </form>
          )}
          {shown.length === 0 ? <Empty text="No members here." /> : (
            <div className="space-y-3">{shown.map(p => {
              const myTasks = tasks.rows.filter(t => t.assigned_to === p.id)
              const open = myTasks.filter(t => t.status !== 'done')
              const mine = att.rows.filter(a => a.user_id === p.id)
              const todayRec = mine.find(a => a.day === t0)
              const presentMonth = mine.filter(a => a.day.startsWith(month) && a.status === 'present').length
              const detail = isAdmin || p.id === profile?.id
              return (
                <Card key={p.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar path={p.avatar_url} name={p.full_name || p.email} />
                      <div><p className="font-semibold">{p.full_name || '(no name)'}</p><p className="break-all text-sm text-neutral-600">{p.email}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge v={p.role} />
                      {teamName(p.team_id) && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-sm text-orange-900">{teamName(p.team_id)}</span>}
                      {!p.approved && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm text-amber-900">pending</span>}
                    </div>
                  </div>
                  {detail && p.approved && (
                    <div className="mt-3 grid gap-2 border-t pt-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="font-medium">Tasks: {open.length} open, {myTasks.length - open.length} done</p>
                        {open.slice(0, 4).map(t => <p key={t.id} className="mt-1 flex items-center justify-between gap-2"><span className="truncate">{t.title}</span><Badge v={t.status} /></p>)}
                        {open.length > 4 && <p className="mt-1 text-neutral-600">+{open.length - 4} more</p>}
                      </div>
                      <div>
                        <p className="font-medium">Attendance</p>
                        <p className="mt-1 flex items-center gap-2">Today: {todayRec ? <Badge v={todayRec.status} /> : <span className="text-neutral-600">not marked</span>}</p>
                        <p className="mt-1 text-neutral-700">Present this month: {presentMonth}</p>
                      </div>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <Select aria-label="Team" value={p.team_id ?? ''} onChange={e => patch(p.id, { team_id: e.target.value || null })}>
                        <option value="">No team</option>
                        {sortedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                      {p.id !== profile?.id && (
                        <div className="flex flex-wrap gap-2">
                          <Btn onClick={() => patch(p.id, { approved: !p.approved })}>{p.approved ? 'Remove access' : 'Approve'}</Btn>
                          <Btn className="bg-black hover:bg-neutral-800" onClick={() => patch(p.id, { role: p.role === 'admin' ? 'member' : 'admin' })}>Make {p.role === 'admin' ? 'member' : 'admin'}</Btn>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}</div>
          )}
        </>
      )}
    </div>
  )
}
