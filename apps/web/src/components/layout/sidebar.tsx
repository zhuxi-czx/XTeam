'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { House, ChatsCircle, CheckSquare, Target, Robot, Plus, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { agentsApi, conversationsApi, goalsApi, tasksApi, type Conversation } from '@/lib/api'
import { MyAvatar, ME } from '@/components/xt/primitives'

interface NavItem {
  href: string
  label: string
  icon: Icon
  count?: number
}

export function Sidebar() {
  const pathname = usePathname()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [runningTasks, setRunningTasks] = useState(0)
  const [agentCount, setAgentCount] = useState(0)
  const [activeGoals, setActiveGoals] = useState(0)

  useEffect(() => {
    conversationsApi.list().then(setConvs).catch(() => {})
    tasksApi.list('running').then((t) => setRunningTasks(t.length)).catch(() => {})
    agentsApi.list().then((a) => setAgentCount(a.length)).catch(() => {})
    goalsApi.list().then((g) => setActiveGoals(g.filter((x) => x.status === 'active').length)).catch(() => {})
  }, [pathname])

  const nav: NavItem[] = [
    { href: '/', label: '工作台', icon: House },
    { href: '/conversation', label: '对话', icon: ChatsCircle },
    { href: '/tasks', label: '任务', icon: CheckSquare, count: runningTasks || undefined },
    { href: '/goals', label: '目标', icon: Target, count: activeGoals || undefined },
    { href: '/agents', label: 'Agent', icon: Robot, count: agentCount || undefined },
  ]

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-5 px-2 py-4">
      <div className="flex items-center gap-2.5 px-2">
        <div
          className="flex size-7 items-center justify-center rounded-lg text-[11px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #33d6c0 0%, #5083fb 30%, #336df4 55%, #4752e6 78%, #8d55ed 100%)' }}
        >
          XT
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">新增长实验室</div>
          <div className="text-xs text-ink-3">Growth Lab</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                active ? 'bg-surface font-medium text-ink' : 'text-ink-2 hover:bg-white/60',
              )}
            >
              <Icon weight="fill" size={18} className={active ? 'text-brand' : 'text-ink-2'} />
              <span className="flex-1">{item.label}</span>
              {item.count !== undefined && <span className="text-xs text-ink-3">{item.count}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <div className="flex items-center px-3 py-1">
          <span className="flex-1 text-xs text-ink-3">最近对话</span>
          <Link href="/" aria-label="发起新目标" className="text-ink-3 hover:text-ink-2">
            <Plus size={14} />
          </Link>
        </div>
        <Suspense>
          <RecentConversations convs={convs.slice(0, 6)} />
        </Suspense>
      </div>

      <div className="flex items-center gap-2.5 px-2">
        <MyAvatar size={28} />
        <div className="min-w-0">
          <div className="text-xs font-medium text-ink">{ME.name}</div>
          <div className="text-xs text-ink-3">{ME.role}</div>
        </div>
      </div>
    </aside>
  )
}

function RecentConversations({ convs }: { convs: Conversation[] }) {
  const pathname = usePathname()
  const activeId = useSearchParams().get('id')

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto">
      {convs.map((c, i) => {
        // 未指定 id 时，对话页默认打开第一个对话
        const active = pathname.startsWith('/conversation') && (activeId ? activeId === c.id : i === 0)
        return (
          <Link
            key={c.id}
            href={`/conversation?id=${c.id}`}
            className={cn(
              'truncate rounded-lg px-3 py-1.5 text-sm transition-colors',
              active ? 'bg-white/70 text-ink' : 'text-ink-2 hover:bg-white/60',
            )}
          >
            {c.title}
          </Link>
        )
      })}
    </div>
  )
}
