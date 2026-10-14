import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import { Btn, Card, Loading } from './components/ui'
import Login from './pages/Login'
import Reset from './pages/Reset'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Attendance from './pages/Attendance'
import Reports from './pages/Reports'
import Announcements from './pages/Announcements'
import Team from './pages/Team'

function Gate() {
  const { session, profile, loading, refresh } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Login />
  if (!profile?.approved) return (
    <div className="mx-auto max-w-md p-4 pt-20"><Card>
      <h1 className="text-xl font-bold">Waiting for approval</h1>
      <p className="my-3">Your account exists, but an admin has not approved it yet.</p>
      <div className="flex gap-2"><Btn onClick={refresh}>Check again</Btn><Btn className="bg-black hover:bg-neutral-800" onClick={() => supabase.auth.signOut()}>Log out</Btn></div>
    </Card></div>
  )
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="team" element={<Team />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter><AuthProvider>
      <Routes><Route path="/reset" element={<Reset />} /><Route path="*" element={<Gate />} /></Routes>
    </AuthProvider></BrowserRouter>
  )
}
