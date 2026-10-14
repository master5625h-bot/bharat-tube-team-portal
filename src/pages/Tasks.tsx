import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type Profile, type Team } from '../lib/supabase'
import { presetsFor } from '../lib/taskPresets'
import { useTable } from '../lib/useTable'
import Comments, { type Comment } from '../components/Comments'
import { Badge, Btn, Card, Empty, ErrorMsg, Field, Input, Loading, PageTitle, Select, Textarea } from '../components/ui'

type Task = { id: string; title: string; description: string; status: string; priority: string; due_date: string | null; assigned_to: string | null }

export default function Tasks() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { rows, loading, error, reload } = useTable<Task>('tasks')
  const team = useTable<Profile>('profiles')
  const comments = useTable<Comment>('task_comments')
  const teams = useTable<Team>('teams')
  const [preset, setPreset] = useState('')
  const [f, setF] = useState({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' })
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [err, setErr] = useState('')

  async function add(e: FormEvent) {
    e.preventDefault(); setErr('')
    if (!f.title.trim()) { setErr('Please choose a task type or write a custom title.'); return }
    const { error } = await supabase.from('tasks').insert({ ...f, due_date: f.due_date || null, assigned_to: f.assigned_to || null })
    if (error) setErr(error.message); else { setF({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' }); setPreset(''); reload() }
  }
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (error) setErr(error.message); else reload()
  }
  const assignee = team.rows.find(p => p.id === f.assigned_to)
  const assigneeTeam = teams.rows.find(t => t.id === assignee?.team_id)?.name
  const presetOpts = presetsFor(assigneeTeam)
  const name = (id: string | null) => team.rows.find(p => p.id === id)?.full_name || team.rows.find(p => p.id === id)?.email || 'Unassigned'
  const shown = rows.filter(t => (filter === 'all' || t.status === filter) && t.title.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <PageTitle>Tasks</PageTitle>
      {isAdmin && (
        <Card className="mb-4"><form onSubmit={add} className="space-y-3">
          <h2 className="font-bold">New task</h2>
          <Field label="Assign to"><Select value={f.assigned_to} onChange={e => setF({ ...f, assigned_to: e.target.value })}>
              <option value="">Unassigned</option>{team.rows.filter(p => p.approved).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select></Field>
          <Field label="Task type">
            <Select value={preset} onChange={e => { setPreset(e.target.value); setF({ ...f, title: e.target.value === '__custom' ? '' : e.target.value }) }}>
              <option value="">Choose...</option>
              {presetOpts.own.length > 0 && <optgroup label={`${assigneeTeam} team`}>{presetOpts.own.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
              <optgroup label="General">{presetOpts.general.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
              <option value="__custom">Custom (type my own)</option>
            </Select>
          </Field>
          {preset === '__custom' && <Field label="Title"><Input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>}
          <Field label="Details"><Textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority"><Select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}><option>low</option><option>medium</option><option>high</option></Select></Field>
            <Field label="Due date"><Input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} /></Field>
          </div>
          <Btn>Add task</Btn>
        </form></Card>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input placeholder="Search tasks" value={q} onChange={e => setQ(e.target.value)} />
        <Select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></Select>
      </div>
      {(error || err) && <ErrorMsg msg={error || err} />}
      {loading ? <Loading /> : shown.length === 0 ? <Empty text="No tasks found." /> : (
        <div className="space-y-3">{shown.map(t => (
          <Card key={t.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-lg font-semibold">{t.title}</p><div className="flex gap-2"><Badge v={t.priority} /><Badge v={t.status} /></div></div>
            {t.description && <p className="mt-1 text-neutral-700">{t.description}</p>}
            <p className="mt-2 text-sm text-neutral-600">{name(t.assigned_to)}{t.due_date ? ` · due ${t.due_date}` : ''}</p>
            <div className="mt-3 max-w-xs"><Select value={t.status} onChange={e => setStatus(t.id, e.target.value)}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></Select></div>
            <Comments taskId={t.id} comments={comments.rows} people={team.rows} onChange={comments.reload} />
          </Card>))}</div>
      )}
    </div>
  )
}
