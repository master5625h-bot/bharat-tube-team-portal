import { useMemo, useRef } from 'react'
import { useTable } from './useTable'
import type { Profile } from './supabase'

export function usePeople() {
  const t = useTable<Profile>('profiles')
  const name = useMemo(() => (id?: string | null) => {
    const p = t.rows.find(x => x.id === id)
    return p?.full_name || p?.email || 'Member'
  }, [t.rows])
  return { people: t.rows, name }
}
export const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
export const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// Blocks a second tap while the first save is still running
export function useOnce() {
  const lock = useRef(false)
  return async (fn: () => Promise<void>) => { if (lock.current) return; lock.current = true; try { await fn() } finally { lock.current = false } }
}
