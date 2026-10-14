import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Btn, Card, ErrorMsg, Field, Input } from '../components/ui'

export default function Reset() {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()
  async function submit(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setErr(error.message); else nav('/')
  }
  return (
    <div className="mx-auto max-w-md p-4 pt-20"><Card>
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-xl font-bold">Set a new password</h1>
        <Field label="New password"><Input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></Field>
        {err && <ErrorMsg msg={err} />}
        <Btn className="w-full">Save password</Btn>
      </form>
    </Card></div>
  )
}
