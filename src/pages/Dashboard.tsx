import { useAuth } from '../lib/auth'
import { useTable } from '../lib/useTable'
import { localToday } from '../lib/people'
import { Badge, Card, Empty, ErrorMsg, Loading, PageTitle, Stat } from '../components/ui'

type Task = { id: string; title: string; status: string; due_date: string | null }
type Att = { id: string; status: string; day: string }
type Ann = { id: string; title: string; body: string; created_at: string }
type Rep = { id: string }
type Prof = { id: string; approved: boolean }

export default function Dashboard() {
  const { profile } = useAuth()
  const tasks = useTable<Task>('tasks')
  const att = useTable<Att>('attendance', '*', 'day')
  const ann = useTable<Ann>('announcements')
  const reps = useTable<Rep>('weekly_reports')
  const team = useTable<Prof>('profiles')
  const today = localToday()
  if (tasks.loading || att.loading || ann.loading || team.loading || reps.loading) return <Loading />
  const err = tasks.error || att.error || ann.error || reps.error || team.error
  const pending = tasks.rows.filter(t => t.status !== 'done')
  const overdue = pending.filter(t => t.due_date && t.due_date < today)
  const presentToday = att.rows.filter(a => a.day === today && a.status === 'present').length
  return (
    <div>
      <PageTitle>Hi {profile?.full_name || 'there'}</PageTitle>
      {err && <ErrorMsg msg={err} />}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Team members" value={team.rows.filter(p => p.approved).length} />
        <Stat label="Pending tasks" value={pending.length} />
        <Stat label="Overdue tasks" value={overdue.length} />
        <Stat label="Present today" value={presentToday} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold">Latest announcements</h2>
          {ann.rows.length === 0 ? <Empty text="No announcements yet." /> : ann.rows.slice(0, 3).map(a => (
            <div key={a.id} className="border-b py-2 last:border-0"><p className="font-semibold">{a.title}</p><p className="text-neutral-700">{a.body}</p></div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-bold">Open tasks</h2>
          {pending.length === 0 ? <Empty text="Nothing pending. 🎉" /> : pending.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0"><span>{t.title}</span><Badge v={t.status} /></div>
          ))}
          <p className="mt-3 text-sm text-neutral-600">Reports submitted: {reps.rows.length}</p>
        </Card>
      </div>
    </div>
  )
}
