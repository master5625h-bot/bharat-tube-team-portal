import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type Profile } from './supabase'

type Ctx = { session: Session | null; profile: Profile | null; loading: boolean; refresh: () => void }
const AuthCtx = createContext<Ctx>({ session: null, profile: null, loading: true, refresh: () => {} })
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  // id of the user whose profile has been fetched; avoids showing "waiting" before the fetch ends
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setSessionReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null
  useEffect(() => {
    let live = true
    if (!userId) { setProfile(null); setLoadedFor(null); return }
    supabase.from('profiles').select('*').eq('id', userId).single()
      .then(({ data }) => { if (live) { setProfile(data as Profile | null); setLoadedFor(userId) } })
    return () => { live = false }
  }, [userId, tick])

  const loading = !sessionReady || (userId !== null && loadedFor !== userId)
  return <AuthCtx.Provider value={{ session, profile, loading, refresh: () => setTick(t => t + 1) }}>{children}</AuthCtx.Provider>
}
