import { useState, type FormEvent } from 'react'
import { supabase, configured } from '../lib/supabase'
import { Btn, Card, ErrorMsg, Field, Input } from '../components/ui'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErr(error.message)
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (error) setErr(error.message)
      else setOk('Account created. An admin must approve you before you can enter.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset' })
      if (error) setErr(error.message); else setOk('Password reset link sent. Check your email.')
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <p className="mb-6 text-center text-3xl font-bold">Bharat<span className="text-brand">Tube</span> Team Portal</p>
      <Card>
        {!configured && <ErrorMsg msg="Supabase is not configured yet (missing environment values)." />}
        <form onSubmit={submit} className="space-y-4">
          <h1 className="text-xl font-bold">{mode === 'login' ? 'Log in' : mode === 'signup' ? 'Request access' : 'Reset password'}</h1>
          {mode === 'signup' && <Field label="Full name"><Input required value={name} onChange={e => setName(e.target.value)} /></Field>}
          <Field label="Email"><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
          {mode !== 'reset' && <Field label="Password"><Input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></Field>}
          {err && <ErrorMsg msg={err} />}
          {ok && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{ok}</p>}
          <Btn disabled={busy} className="w-full">{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}</Btn>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <button className="min-h-11 underline" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Request access' : 'Back to log in'}</button>
          {mode === 'login' && <button className="min-h-11 underline" onClick={() => setMode('reset')}>Forgot password?</button>}
        </div>
      </Card>
    </div>
  )
}
