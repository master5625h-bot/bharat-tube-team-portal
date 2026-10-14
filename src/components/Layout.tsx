import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const links = [
  ['/', 'Dashboard'], ['/tasks', 'Tasks'], ['/attendance', 'Attendance'],
  ['/reports', 'Reports'], ['/announcements', 'News'], ['/team', 'Team'],
]
const cls = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-3 font-medium ${isActive ? 'bg-brand text-white' : 'text-neutral-200 hover:bg-neutral-800'}`

export default function Layout() {
  const { profile, session } = useAuth()
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-black p-4 md:flex">
        <p className="mb-6 text-xl font-bold text-white">Bharat<span className="text-brand">Tube</span> <span className="block text-sm font-normal text-neutral-400">Team Portal</span></p>
        <nav className="flex-1 space-y-1">{links.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={cls}>{l}</NavLink>)}</nav>
        <p className="mb-2 break-all text-sm text-neutral-400">{session?.user.email} ({profile?.role})</p>
        <button onClick={() => supabase.auth.signOut()} className="min-h-11 rounded-lg border border-neutral-600 text-white">Log out</button>
      </aside>
      <header className="flex items-center justify-between bg-black px-4 py-3 md:hidden">
        <p className="font-bold text-white">Bharat<span className="text-brand">Tube</span></p>
        <button onClick={() => supabase.auth.signOut()} className="min-h-11 px-3 text-white">Log out</button>
      </header>
      <main className="flex-1 p-4 pb-24 md:p-8"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-6 border-t border-neutral-700 bg-black md:hidden">
        {links.map(([to, l]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `py-3 text-center text-xs ${isActive ? 'text-brand font-bold' : 'text-neutral-300'}`}>{l}</NavLink>
        ))}
      </nav>
    </div>
  )
}
