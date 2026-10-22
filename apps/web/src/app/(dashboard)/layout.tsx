import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-app">
      <Sidebar />
      <main className="flex min-w-0 flex-1 py-2 pr-2">
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl bg-surface">{children}</div>
      </main>
    </div>
  )
}
