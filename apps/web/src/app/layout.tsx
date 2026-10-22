import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'XTeam - Human-Agent Collaborative Platform',
  description: '人与 Agent 共存的协同平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
