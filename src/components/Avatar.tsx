import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const cache = new Map<string, { url: string; at: number }>()

export function Avatar({ path, name, size = 40 }: { path?: string | null; name: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    if (!path) { setUrl(null); return }
    const hit = cache.get(path)
    if (hit && Date.now() - hit.at < 50 * 60 * 1000) { setUrl(hit.url); return }
    supabase.storage.from('avatars').createSignedUrl(path, 3600).then(({ data }) => {
      if (live && data?.signedUrl) { cache.set(path, { url: data.signedUrl, at: Date.now() }); setUrl(data.signedUrl) }
    })
    return () => { live = false }
  }, [path])
  const letter = (name.trim()[0] ?? '?').toUpperCase()
  const style = { width: size, height: size }
  return url
    ? <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />
    : <span style={{ ...style, fontSize: size * 0.45 }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-800 font-bold text-white" aria-label={name}>{letter}</span>
}
