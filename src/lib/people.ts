import { useMemo } from 'react'
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
