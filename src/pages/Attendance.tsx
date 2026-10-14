import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type Profile } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { Badge, Btn, Card, Empty, ErrorMsg, Loading, PageTitle, Select } from '../components/ui'

type Att = { id: string; user_id: string; day: string; status: string }

export default function Attendance() {
  const { profile } = useAuth()
  const { rows, loading, error, reload } = useTable<Att>('attendance', '*', 'day')
  const team = useTable<Profile>('profiles')
  const [status, setStatus] = useState('present')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  async function mark() {
    setErr(''); setMsg('')
    const { error } = await supabase.from('attendance').insert({ status })
    if (error) setErr(error.code === '23505' ? 'You already marked attendance today.' : error.message)
    else { setMsg('Attendance saved.'); reload() }
  }
  const who = (id: string) => team.rows.find(p => p.id === id)?.full_name || team.rows.find(p => p.id === id)?.email || id.slice(0, 6)
  return (
    <div>
      <PageTitle>Attendance</PageTitle>
      <Card className="mb-4"><h2 className="mb-2 font-bold">Mark today</h2>
        <div className="flex gap-3"><Select value={status} onChange={e => setStatus(e.target.value)}><option>present</option><option>absent</option><option>leave</option></Select><Btn onClick={mark}>Save</Btn></div>
        {msg && <p role="status" className="mt-2 text-green-800">{msg}</p>}
      </Card>
      {(error || err) && <ErrorMsg msg={error || err} />}
      {loading ? <Loading /> : rows.length === 0 ? <Empty text="No attendance records yet." /> : (
        <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left">
          <thead className="bg-neutral-100"><tr><th className="p-3">Date</th>{profile?.role === 'admin' && <th className="p-3">Member</th>}<th className="p-3">Status</th></tr></thead>
          <tbody>{rows.map(a => <tr key={a.id} className="border-t"><td className="p-3">{a.day}</td>{profile?.role === 'admin' && <td className="p-3">{who(a.user_id)}</td>}<td className="p-3"><Badge v={a.status} /></td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  )
}
