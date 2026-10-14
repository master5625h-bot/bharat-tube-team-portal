import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const cache = new Map<string, { url: string; at: number }>()

export function Avatar({ path, name, size = 40, ring = true }: { path?: string | null; name: string; size?: number; ring?: boolean }) {
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
  const inner = url
    ? <img src={url} alt={name} style={{ width: size, height: size }} className="rounded-full border-2 border-white object-cover" />
    : <span style={{ width: size, height: size, fontSize: size * 0.42 }} className="inline-flex items-center justify-center rounded-full border-2 border-white bg-neutral-900 font-bold text-white" aria-label={name}>{letter}</span>
  return ring ? <span className="ig-ring inline-flex shrink-0 rounded-full p-[2px]">{inner}</span> : <span className="inline-flex shrink-0">{inner}</span>
}
