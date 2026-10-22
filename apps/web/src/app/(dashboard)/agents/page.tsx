'use client'

import { useEffect, useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { shortAgentName } from '@/lib/agent-style'
import { AgentAvatar, Tag } from '@/components/xt/primitives'
import { agentsApi, tasksApi, type Agent } from '@/lib/api'

type State = 'working' | 'idle' | 'offline'

const STATE: Record<State, { label: string; tone: 'brand' | 'success' | 'neutral' }> = {
  working: { label: '工作中', tone: 'brand' },
  idle: { label: '空闲', tone: 'success' },
  offline: { label: '离线', tone: 'neutral' },
}

const FILTERS: { key: State | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'working', label: '工作中' },
  { key: 'idle', label: '空闲' },
  { key: 'offline', label: '离线' },
]

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<State | 'all'>('all')

  useEffect(() => {
    agentsApi.list().then(setAgents).catch(() => setAgents([]))
    // agents.status 不会随执行更新，“工作中”以是否有执行中的任务为准
    tasksApi
      .list('running')
      .then((ts) => setBusyIds(new Set(ts.map((t) => t.assignee_id).filter(Boolean) as string[])))
      .catch(() => {})
  }, [])

  if (!agents) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <CircleNotch size={24} className="animate-spin text-brand" />
      </div>
    )
  }

  const stateOf = (a: Agent): State => (a.status === 'offline' ? 'offline' : busyIds.has(a.id) || a.status === 'busy' ? 'working' : 'idle')
  const count = (k: State | 'all') => (k === 'all' ? agents.length : agents.filter((a) => stateOf(a) === k).length)
  const shown = filter === 'all' ? agents : agents.filter((a) => stateOf(a) === filter)

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 pb-4 pt-5">
        <h1 className="text-2xl font-semibold text-ink">Agent</h1>
        <div className="flex gap-0.5 rounded-lg bg-fill-2 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'h-7 rounded-md px-3 text-xs transition-colors',
                filter === f.key ? 'bg-surface font-medium text-ink' : 'text-ink-2 hover:text-ink',
              )}
            >
              {f.label} {count(f.key)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {shown.length === 0 ? (
          <p className="py-24 text-center text-sm text-ink-3">这里还没有 Agent</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {shown.map((a) => (
              <AgentCard key={a.id} agent={a} state={stateOf(a)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentCard({ agent, state }: { agent: Agent; state: State }) {
  const s = STATE[state]
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-fill p-5">
      <div className="flex items-center gap-3">
        <AgentAvatar name={agent.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-ink">{shortAgentName(agent.name)}</div>
          <div className="truncate text-xs text-ink-3">{agent.model}</div>
        </div>
        <Tag tone={s.tone}>{s.label}</Tag>
      </div>
      <p className="line-clamp-1 text-sm text-ink-2">{agent.description}</p>
      <div className="text-xs text-ink-3">
        已完成 <span className="text-sm font-semibold tabular-nums text-ink">{agent.tasks_completed}</span> 个任务
      </div>
    </div>
  )
}
