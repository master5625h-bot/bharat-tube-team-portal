import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Loads rows from a table. RLS in the database decides what each user may see.
export function useTable<T>(table: string, select = '*', order = 'created_at', ascending = false) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    const { data, error } = await supabase.from(table).select(select).order(order, { ascending })
    if (error) setError(error.message); else { setError(''); setRows((data ?? []) as T[]) }
    setLoading(false)
  }, [table, select, order, ascending])
  useEffect(() => { reload() }, [reload])
  return { rows, loading, error, reload }
}
