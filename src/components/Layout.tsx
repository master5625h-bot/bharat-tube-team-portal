import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useChat } from '../lib/chat'

const main = [['/', 'Home'], ['/tasks', 'Tasks'], ['/chat', 'Chat'], ['/team', 'Team']]
const more = [
  ['/ideas', 'Ideas'], ['/attendance', 'Attendance'], ['/reports', 'Reports'], ['/announcements', 'News'], ['/calendar', 'Content calendar'],
  ['/polls', 'Polls'], ['/checkin', 'Daily check-in'], ['/resources', 'Resources'], ['/activity', 'Activity'],
]
const links = [...main, ...more]
const cls = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-3 font-semibold ${isActive ? 'ig-bg text-white' : 'text-neutral-200 hover:bg-neutral-800'}`

export default function Layout() {
  const { profile, session } = useAuth()
  const loc = useLocation()
  const { totalUnread } = useChat()
  const dot = (to: string) => to === '/chat' && totalUnread > 0 ? <span aria-label={`${totalUnread} unread`} className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-pink-500 align-middle" /> : null
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [loc.pathname])
  const moreActive = more.some(([to]) => loc.pathname.startsWith(to))
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-black p-4 md:flex">
        <p className="mb-6 text-xl font-bold text-white">Bharat<span className="text-brand">Tube</span> <span className="block text-sm font-normal text-neutral-400">Team Portal</span></p>
        <nav className="flex-1 space-y-1">{links.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={cls}>{l}{dot(to)}</NavLink>)}</nav>
        <p className="mb-2 break-all text-sm text-neutral-400">{session?.user.email} ({profile?.role})</p>
        <button onClick={() => supabase.auth.signOut()} className="min-h-11 rounded-full border border-neutral-600 text-white">Log out</button>
      </aside>
      <div className="sticky top-0 z-10 md:hidden"><div className="ig-bg h-0.5" />
        <header className="flex items-center justify-between bg-black px-4 py-2"><span className="sr-only">BharatTube</span>
          <p className="font-bold text-white">Bharat<span className="text-brand">Tube</span></p>
          <button onClick={() => supabase.auth.signOut()} className="min-h-11 px-3 text-white">Log out</button>
        </header>
        <nav className="flex gap-1 border-t border-neutral-800 bg-black px-2 pb-2 pt-1">
          {main.map(([to, l]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `min-h-11 flex-1 whitespace-nowrap rounded-full px-1 py-2.5 text-center text-sm font-medium ${isActive ? 'ig-bg text-white' : 'text-neutral-200'}`}>{l}{dot(to)}</NavLink>
          ))}
          <button aria-expanded={open} onClick={() => setOpen(!open)} className={`min-h-11 flex-1 rounded-full px-1 py-2.5 text-center text-sm font-medium ${moreActive || open ? 'ig-bg text-white' : 'text-neutral-200'}`}>More ▾</button>
        </nav>
        {open && <div className="grid grid-cols-2 gap-2 rounded-b-3xl border-t border-neutral-800 bg-black p-3 shadow-2xl">
          {more.map(([to, l]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `min-h-11 rounded-2xl px-3 py-3 text-sm font-semibold ${isActive ? 'ig-bg text-white' : 'bg-neutral-900 text-neutral-100'}`}>{l}</NavLink>
          ))}</div>}
      </div>
      <main onClick={() => open && setOpen(false)} className="mx-auto w-full max-w-3xl flex-1 p-4 pb-16 md:p-8"><Outlet /></main>
    </div>
  )
}
