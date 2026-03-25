'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Bot,
  Target,
  Brain,
  IterationCw,
} from 'lucide-react'

const navItems = [
  { href: '/', label: '工作台', icon: LayoutDashboard },
  { href: '/conversation', label: '对话', icon: MessageSquare },
  { href: '/tasks', label: '任务', icon: CheckSquare },
  { href: '/agents', label: 'Agent', icon: Bot },
  { href: '/goals', label: '目标', icon: Target },
  { href: '/memory', label: '记忆', icon: Brain },
  { href: '/feedback', label: '回流', icon: IterationCw },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border/40 bg-background">
      {/* Logo + Workspace */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-content rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white font-bold text-sm">
          XT
        </div>
        <div>
          <h1 className="text-sm font-semibold">新增长实验室</h1>
          <p className="text-xs text-muted-foreground">Growth Lab</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Pinned Conversations */}
      <div className="border-t border-border/40 px-4 py-3">
        <p className="text-xs text-muted-foreground mb-2">置顶对话</p>
        <div className="space-y-1.5">
          {[
            { title: '内容增长策略', status: '进行中', count: '3 人' },
            { title: '产品体验优化', status: '待确认', count: '2 人' },
            { title: '用户反馈分析', status: '已完成', count: '4 人' },
          ].map((conv) => (
            <div
              key={conv.title}
              className="rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="font-medium text-sm">{conv.title}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{conv.status}</span>
                <span>·</span>
                <span>{conv.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
