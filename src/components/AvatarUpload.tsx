import { useState, type ChangeEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Avatar } from './Avatar'
import { Card, ErrorMsg } from './ui'

// Crops to a centered square and shrinks to 256px JPEG so uploads stay tiny.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const side = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256)
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not process image'))), 'image/jpeg', 0.85))
}

export default function AvatarUpload({ onDone }: { onDone: () => void }) {
  const { profile, refresh } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  if (!profile) return null

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !profile) return
    setErr(''); setOk(''); setBusy(true)
    try {
      if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
      const blob = await toSquareJpeg(file)
      const path = `${profile.id}/avatar-${Date.now()}.jpg`
      const up = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', profile.id)
      if (error) throw error
      if (profile.avatar_url) await supabase.storage.from('avatars').remove([profile.avatar_url])
      setOk('Photo updated.'); refresh(); onDone()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Upload failed')
    }
    setBusy(false)
  }

  return (
    <Card className="mb-4">
      <h2 className="mb-3 font-bold">My profile photo</h2>
      <div className="flex items-center gap-4">
        <Avatar path={profile.avatar_url} name={profile.full_name || profile.email} size={72} />
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-brand px-4 py-2 font-semibold text-white">
          {busy ? 'Uploading...' : profile.avatar_url ? 'Change photo' : 'Upload photo'}
          <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={pick} />
        </label>
      </div>
      {err && <div className="mt-3"><ErrorMsg msg={err} /></div>}
      {ok && <p role="status" className="mt-3 text-green-800">{ok}</p>}
    </Card>
  )
}
