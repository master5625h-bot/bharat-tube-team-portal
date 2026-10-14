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
import { ChatList, ChatRoom } from './pages/Chat'
import { ChatProvider } from './lib/chat'
import Ideas from './pages/Ideas'
import ContentCalendar from './pages/ContentCalendar'
import Polls from './pages/Polls'
import Checkins from './pages/Checkins'
import Resources from './pages/Resources'
import Activity from './pages/Activity'

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
    <ChatProvider><Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="team" element={<Team />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="calendar" element={<ContentCalendar />} />
        <Route path="polls" element={<Polls />} />
        <Route path="checkin" element={<Checkins />} />
        <Route path="resources" element={<Resources />} />
        <Route path="activity" element={<Activity />} />
        <Route path="chat" element={<ChatList />} />
        <Route path="chat/:key" element={<ChatRoom />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes></ChatProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter><AuthProvider>
      <Routes><Route path="/reset" element={<Reset />} /><Route path="*" element={<Gate />} /></Routes>
    </AuthProvider></BrowserRouter>
  )
}
