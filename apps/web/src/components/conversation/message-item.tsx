'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { shortAgentName } from '@/lib/agent-style'
import { AgentAvatar, BotTag, MyAvatar, OrchestratorAvatar, Tag, ME } from '@/components/xt/primitives'
import { PlanCard, type PlanStep } from './plan-card'
import type { Task } from '@/lib/api'

export type ChatItem =
  | { kind: 'human'; id: string; time: string; content: string; isGoal?: boolean }
  | { kind: 'agent'; id: string; time: string; name: string; content: string; streaming?: boolean }
  | { kind: 'plan'; id: string; time: string; steps: PlanStep[] }
  | { kind: 'summary'; id: string; time: string; sections: { title: string; body: string }[] }
  | { kind: 'note'; id: string; time: string; content: string }

const ORCHESTRATOR = '编排助手'

export function MessageItem({ item, tasks }: { item: ChatItem; tasks: Map<string, Task> }) {
  switch (item.kind) {
    case 'human':
      return (
        <Row avatar={<MyAvatar />} name={ME.name} time={item.time}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {item.isGoal && (
              <span className="mr-1.5 align-[1px]">
                <Tag tone="brand">目标</Tag>
              </span>
            )}
            {item.content}
          </p>
        </Row>
      )
    case 'agent': {
      const isOrchestrator = !/Agent$/i.test(item.name)
      return (
        <Row
          avatar={isOrchestrator ? <OrchestratorAvatar /> : <AgentAvatar name={item.name} />}
          name={isOrchestrator ? item.name : shortAgentName(item.name)}
          bot
          time={item.time}
        >
          {item.content ? <RichText text={item.content} /> : <TypingDots />}
        </Row>
      )
    }
    case 'plan':
      return (
        <Row avatar={<OrchestratorAvatar />} name={ORCHESTRATOR} bot time={item.time}>
          <p className="text-sm text-ink">拆成了 {item.steps.length} 个任务，已分配好 👇</p>
          <PlanCard steps={item.steps} tasks={tasks} />
        </Row>
      )
    case 'summary':
      return (
        <Row avatar={<OrchestratorAvatar />} name={ORCHESTRATOR} bot time={item.time}>
          <p className="text-sm text-ink">全部完成 🎉 结果如下：</p>
          <div className="flex flex-col gap-2">
            {item.sections.map((s, i) => (
              <SummarySection key={i} title={s.title} body={s.body} />
            ))}
          </div>
        </Row>
      )
    case 'note':
      return (
        <Row avatar={<OrchestratorAvatar />} name={ORCHESTRATOR} bot time={item.time}>
          <p className="text-sm text-ink-2">{item.content}</p>
        </Row>
      )
  }
}

function Row({
  avatar,
  name,
  bot,
  time,
  children,
}: {
  avatar: React.ReactNode
  name: string
  bot?: boolean
  time: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      {avatar}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex h-5 items-center gap-2">
          <span className="text-sm font-medium text-ink">{name}</span>
          {bot && <BotTag />}
          <span className="text-xs text-ink-3">{time}</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function SummarySection({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg bg-fill px-4 py-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <span className="flex-1 text-sm font-medium text-ink">{title}</span>
        <CaretDown size={14} className={cn('text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>
      {/* 正文是多段落，line-clamp 不生效，折叠时改用限高 + 底部渐隐 */}
      <div
        className={cn('mt-1.5', !open && 'max-h-11 overflow-hidden')}
        style={open ? undefined : { maskImage: 'linear-gradient(180deg, #000 50%, transparent)' }}
      >
        <RichText text={body} muted />
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex h-5 items-center gap-1">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}

/** 轻量 Markdown：标题行加粗、**粗体**、列表项；够用即可，不引入解析库 */
function RichText({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1 text-sm leading-relaxed', muted ? 'text-ink-2' : 'text-ink')}>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        const heading = line.match(/^#{1,6}\s+(.*)/)
        if (heading) return <p key={i} className="font-semibold text-ink">{inline(heading[1])}</p>
        return <p key={i} className="whitespace-pre-wrap">{inline(line)}</p>
      })}
    </div>
  )
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}
