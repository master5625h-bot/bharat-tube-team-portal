import type { ReactNode } from 'react'

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
)
export const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <Card><p className="text-sm text-neutral-600">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></Card>
)
const tone: Record<string, string> = {
  todo: 'bg-neutral-100 text-neutral-800', in_progress: 'bg-amber-100 text-amber-900', done: 'bg-green-100 text-green-900',
  low: 'bg-neutral-100 text-neutral-800', medium: 'bg-amber-100 text-amber-900', high: 'bg-red-100 text-red-900',
  present: 'bg-green-100 text-green-900', absent: 'bg-red-100 text-red-900', leave: 'bg-blue-100 text-blue-900',
  admin: 'bg-black text-white', member: 'bg-neutral-100 text-neutral-800',
}
export const Badge = ({ v }: { v: string }) => (
  <span className={`inline-block rounded-full px-2.5 py-1 text-sm font-medium ${tone[v] ?? tone.todo}`}>{v.replace('_', ' ')}</span>
)
export const Btn = ({ className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`min-h-11 rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-50 ${className}`} />
)
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 ${p.className ?? ''}`} />
)
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className="min-h-24 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" />
)
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" />
)
export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block"><span className="mb-1 block text-sm font-medium">{label}</span>{children}</label>
)
export const Loading = () => <p className="p-4 text-neutral-600" role="status">Loading...</p>
export const ErrorMsg = ({ msg }: { msg: string }) => <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{msg}</p>
export const Empty = ({ text }: { text: string }) => <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-neutral-600">{text}</p>
export const PageTitle = ({ children }: { children: ReactNode }) => <h1 className="mb-4 text-2xl font-bold">{children}</h1>
