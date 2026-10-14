import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type Profile } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { localToday, useOnce } from '../lib/people'
import AttendanceCalendar, { type Att } from '../components/AttendanceCalendar'
import { Btn, Card, ErrorMsg, Loading, PageTitle, Select } from '../components/ui'


export default function Attendance() {
  const { profile } = useAuth()
  const { rows, loading, error, reload } = useTable<Att>('attendance', '*', 'day')
  const team = useTable<Profile>('profiles')
  const [status, setStatus] = useState('present')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const once = useOnce()
  const mark = () => once(async () => {
    setErr(''); setMsg('')
    const { error } = await supabase.from('attendance').insert({ status, day: localToday() })
    if (error) setErr(error.code === '23505' ? 'You already marked attendance today.' : error.message)
    else { setMsg('Attendance saved.'); reload() }
  })
  return (
    <div>
      <PageTitle>Attendance</PageTitle>
      <Card className="mb-4"><h2 className="mb-2 font-bold">Mark today</h2>
        <div className="flex gap-3"><Select value={status} onChange={e => setStatus(e.target.value)}><option>present</option><option>absent</option><option>leave</option></Select><Btn onClick={mark}>Save</Btn></div>
        {msg && <p role="status" className="mt-2 text-green-800">{msg}</p>}
      </Card>
      {(error || err) && <ErrorMsg msg={error || err} />}
      {loading ? <Loading /> : <AttendanceCalendar rows={rows} people={team.rows} isAdmin={profile?.role === 'admin'} meId={profile?.id ?? ''} />}
    </div>
  )
}
