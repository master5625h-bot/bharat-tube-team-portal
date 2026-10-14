import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type Profile } from './supabase'

type Ctx = { session: Session | null; profile: Profile | null; loading: boolean; refresh: () => void }
const AuthCtx = createContext<Ctx>({ session: null, profile: null, loading: true, refresh: () => {} })
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let live = true
    if (!session) { setProfile(null); setLoading(false); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => { if (live) { setProfile(data as Profile | null); setLoading(false) } })
    return () => { live = false }
  }, [session, tick])

  return <AuthCtx.Provider value={{ session, profile, loading, refresh: () => setTick(t => t + 1) }}>{children}</AuthCtx.Provider>
}
