import { useTable } from '../lib/useTable'
import { usePeople } from '../lib/people'
import { Card, Empty, ErrorMsg, Loading, PageTitle } from '../components/ui'

type A = { kind: string; at: string; actor_id: string | null; title: string | null }
const text = (k: string, who: string, t: string | null) => {
  switch (k) {
    case 'task_new': return [`📝`, `New task: ${t}`]
    case 'task_done': return [`✅`, `${who} completed task: ${t}`]
    case 'attendance': return [`🗓️`, `${who} marked attendance (${t})`]
    case 'announcement': return [`📢`, `Announcement: ${t}`]
    case 'member': return [`👋`, `${who} joined the team`]
    case 'idea': return [`💡`, `${who} posted an idea: ${t}`]
    case 'checkin': return [`🗒️`, `${who} checked in: ${t}`]
    case 'poll': return [`📊`, `New poll: ${t}`]
    default: return [`•`, t ?? k]
  }
}
export function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  if (m < 1440) return `${Math.round(m / 60)} hr ago`
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

export default function Activity() {
  const { rows, loading, error } = useTable<A>('activity_feed', '*', 'at')
  const { name } = usePeople()
  const items = rows.filter(r => r.at).slice(0, 60)
  return (
    <div>
      <PageTitle>Activity</PageTitle>
      {error && <ErrorMsg msg={error} />}
      {loading ? <Loading /> : items.length === 0 ? <Empty text="Abhi koi activity nahi." /> : (
        <Card>{items.map((r, i) => {
          const [icon, line] = text(r.kind, name(r.actor_id), r.title)
          return <div key={i} className="flex gap-3 border-b py-3 last:border-0"><span aria-hidden>{icon}</span>
            <div className="min-w-0 flex-1"><p className="break-words">{line}</p><p className="text-sm text-neutral-600">{ago(r.at)}</p></div></div>
        })}</Card>)}
    </div>
  )
}
