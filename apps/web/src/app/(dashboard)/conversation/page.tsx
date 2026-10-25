'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NextImage from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { MessageItem, type ChatItem } from '@/components/conversation/message-item'
import type { PlanStep } from '@/components/conversation/plan-card'
import { Composer } from '@/components/xt/composer'
import { GoalPicker } from '@/components/goals/goal-picker'
import { AgentAvatar, MyAvatar, Tag, ME } from '@/components/xt/primitives'
import { shortAgentName } from '@/lib/agent-style'
import {
  conversationsApi,
  sendChatMessage,
  startOrchestration,
  goalsApi,
  tasksApi,
  type Conversation,
  type Goal,
  type Message,
  type Task,
} from '@/lib/api'

const DEFAULT_TITLE = '内容增长策略讨论'
const STREAMING_ID = '__streaming__'
const LIVE_PLAN_ID = '__live_plan__'
const GOAL_PREFIX = '🎯 编排目标：'

function fmtTime(sqliteUtc: string | Date) {
  const d = typeof sqliteUtc === 'string' ? new Date(sqliteUtc.replace(' ', 'T') + 'Z') : sqliteUtc
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/** 把后端存储的消息还原成界面元素：连续的任务创建消息合并成一张执行计划卡片 */
function toChatItems(messages: Message[]): ChatItem[] {
  const items: ChatItem[] = []
  for (const m of messages) {
    const time = fmtTime(m.created_at)
    if (m.sender_type === 'human') {
      const isGoal = m.content.startsWith(GOAL_PREFIX)
      items.push({ kind: 'human', id: m.id, time, isGoal, content: isGoal ? m.content.slice(GOAL_PREFIX.length) : m.content })
    } else if (m.sender_type === 'agent') {
      items.push({ kind: 'agent', id: m.id, time, name: m.sender_name, content: m.content })
    } else if (m.content_type === 'task_card') {
      const meta = safeJson<{ taskId: string; agentName: string }>(m.metadata)
      const title = m.content.match(/任务创建：(.+)/)?.[1] ?? m.content
      if (!meta) continue
      const step: PlanStep = { taskId: meta.taskId, title, agentName: meta.agentName }
      const last = items[items.length - 1]
      if (last?.kind === 'plan') last.steps.push(step)
      else items.push({ kind: 'plan', id: m.id, time, steps: [step] })
    } else if (m.content_type === 'insight') {
      const sections = m.content
        .replace(/^##[^\n]*\n+/, '')
        .split(/\n-{3,}\n/)
        .map((chunk) => {
          const match = chunk.trim().match(/^###\s*(.+)\n([\s\S]*)$/)
          return match ? { title: match[1], body: match[2].trim() } : { title: '结果', body: chunk.trim() }
        })
        .filter((s) => s.body)
      // 旧数据里可能存在空汇总（规划失败），按说明显示，避免出现“全部完成”却没有内容
      items.push(
        sections.length > 0
          ? { kind: 'summary', id: m.id, time, sections }
          : { kind: 'note', id: m.id, time, content: '这次没能拆出任务，可能是模型服务出错了，稍后再试一次。' },
      )
    } else {
      items.push({ kind: 'note', id: m.id, time, content: m.content })
    }
  }
  return items
}

function safeJson<T>(s: string | null): T | null {
  try {
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

export default function ConversationPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ConversationView />
    </Suspense>
  )
}

function ConversationView() {
  const router = useRouter()
  const params = useSearchParams()
  const idParam = params.get('id')
  const goalParam = params.get('goal')
  const goalIdParam = params.get('goalId')

  const [conv, setConv] = useState<Conversation | null>(null)
  const [items, setItems] = useState<ChatItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [busy, setBusy] = useState<'chat' | 'orchestrate' | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const goalStarted = useRef<string | null>(null)

  const refreshTasks = useCallback(async () => {
    try {
      setTasks(await tasksApi.list())
    } catch {
      /* 保留旧数据 */
    }
  }, [])

  const reloadMessages = useCallback(async (id: string) => {
    const msgs = await conversationsApi.messages(id)
    setItems(toChatItems(msgs))
  }, [])

  // 选中对话：URL 指定的 id，否则默认第一个，一个都没有就新建
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const list = await conversationsApi.list()
        let target = idParam ? list.find((c) => c.id === idParam) : list[0]
        if (!target) {
          const { id } = await conversationsApi.create({ title: DEFAULT_TITLE, creatorName: ME.name })
          target = (await conversationsApi.list()).find((c) => c.id === id)
        }
        if (cancelled || !target) return
        setConv(target)
        await Promise.all([reloadMessages(target.id), refreshTasks(), goalsApi.list().then(setGoals).catch(() => {})])
      } catch (err) {
        console.error('加载对话失败', err)
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [idParam, reloadMessages, refreshTasks])

  // 编排期间任务状态变化较快，额外轮询
  useEffect(() => {
    if (busy !== 'orchestrate') return
    const timer = setInterval(refreshTasks, 2000)
    return () => clearInterval(timer)
  }, [busy, refreshTasks])

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    })
  }, [items])

  const orchestrate = useCallback(
    (goal: string, goalId?: string) => {
      if (!conv) return
      setBusy('orchestrate')
      const now = fmtTime(new Date())
      const steps: PlanStep[] = []
      setItems((prev) => [
        ...prev,
        { kind: 'human', id: `goal-${Date.now()}`, time: now, isGoal: true, content: goal },
        { kind: 'note', id: LIVE_PLAN_ID, time: now, content: '正在拆解目标…' },
      ])

      startOrchestration(conv.id, goal, {
        onTaskCreated: (taskId, title, agentName) => {
          steps.push({ taskId, title, agentName })
          const plan: ChatItem = { kind: 'plan', id: LIVE_PLAN_ID, time: now, steps: [...steps] }
          setItems((prev) => prev.map((it) => (it.id === LIVE_PLAN_ID ? plan : it)))
          refreshTasks()
        },
        onTaskProgress: () => refreshTasks(),
        onDone: async () => {
          await Promise.all([reloadMessages(conv.id), refreshTasks()])
          setBusy(null)
        },
        onError: (error) => {
          setItems((prev) =>
            prev.map((it) => (it.id === LIVE_PLAN_ID ? { kind: 'note', id: it.id, time: now, content: `编排失败：${error}` } : it)),
          )
          setBusy(null)
        },
      }, goalId)
    },
    [conv, refreshTasks, reloadMessages],
  )

  // 从首页带着目标过来：自动开始编排，并清掉 URL 里的 goal，避免刷新时重复执行
  useEffect(() => {
    if (!conv || loading || !goalParam || goalStarted.current === conv.id) return
    goalStarted.current = conv.id
    router.replace(`/conversation?id=${conv.id}`)
    // 推迟到 effect 之后再更新状态，避免同步 setState 引发连锁渲染
    queueMicrotask(() => orchestrate(goalParam, goalIdParam ?? undefined))
  }, [conv, loading, goalParam, goalIdParam, orchestrate, router])

  const chat = (text: string) => {
    if (!conv) return
    setBusy('chat')
    const now = fmtTime(new Date())
    setItems((prev) => [
      ...prev,
      { kind: 'human', id: `u-${Date.now()}`, time: now, content: text },
      { kind: 'agent', id: STREAMING_ID, time: now, name: 'AI 助手', content: '' },
    ])
    let acc = ''
    sendChatMessage(conv.id, text, ME.name, {
      onChunk: (chunk) => {
        acc += chunk
        const current = acc
        setItems((prev) => prev.map((it) => (it.id === STREAMING_ID && it.kind === 'agent' ? { ...it, content: current } : it)))
      },
      onDone: (msgId, full) => {
        setItems((prev) =>
          prev.map((it) => (it.id === STREAMING_ID && it.kind === 'agent' ? { ...it, id: msgId, content: full } : it)),
        )
        setBusy(null)
      },
      onError: (error) => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === STREAMING_ID && it.kind === 'agent'
              ? { ...it, id: `err-${Date.now()}`, content: `连接出错了：${error}。请确认 XTeam Server 正在运行。` }
              : it,
          ),
        )
        setBusy(null)
      },
    })
  }

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const convTasks = useMemo(() => tasks.filter((t) => t.conversation_id === conv?.id), [tasks, conv])
  const running = convTasks.find((t) => t.status === 'running')
  const failedCount = convTasks.filter((t) => t.status === 'failed').length
  // 对话所属目标：取它的任务关联的目标；之后在这里继续编排也挂到同一个目标
  const convGoal = goals.find((g) => convTasks.some((t) => t.goal_id === g.id))
  const agentNames = [...new Set(convTasks.map((t) => t.assignee_name).filter(Boolean) as string[])].slice(0, 4)

  if (loading) return <PageSpinner />

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line-soft px-6 py-4">
        <h1 className="truncate text-base font-semibold text-ink">{conv?.title}</h1>
        {running || busy === 'orchestrate' ? (
          <Tag tone="brand">进行中</Tag>
        ) : convTasks.length > 0 && convTasks.every((t) => t.status === 'completed') ? (
          <Tag tone="success">已完成</Tag>
        ) : null}
        {/* 有任务的对话才能关联目标：关联的单位是对话里的全部任务 */}
        {convTasks.length > 0 && conv && (
          <GoalPicker
            variant="pill"
            goals={goals}
            value={convGoal?.id ?? null}
            viewHref={convGoal ? `/goals?open=${convGoal.id}` : undefined}
            onChange={async (goalId) => {
              await conversationsApi.setGoal(conv.id, goalId).catch(() => {})
              await Promise.all([refreshTasks(), goalsApi.list().then(setGoals).catch(() => {})])
            }}
          />
        )}
        <div className="flex-1" />
        <div className="flex -space-x-1.5">
          <MyAvatar size={28} className="ring-2 ring-white" />
          {agentNames.map((n) => (
            <AgentAvatar key={n} name={n} size={28} className="ring-2 ring-white" />
          ))}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-6">
          {failedCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2">
              <WarningCircle size={16} weight="fill" className="text-danger" />
              <span className="flex-1 text-sm font-medium text-ink">{failedCount} 个任务失败了</span>
              <Link href="/tasks" className="text-sm text-danger-text hover:underline">
                去看看 →
              </Link>
            </div>
          )}

          {items.length === 0 ? (
            <EmptyState />
          ) : (
            items.map((it) => <MessageItem key={it.id} item={it} tasks={taskMap} />)
          )}

          {running && (
            <div className="flex items-center gap-3">
              <AgentAvatar name={running.assignee_name ?? ''} />
              <div className="flex items-center gap-2 rounded-full bg-fill px-3 py-1.5 text-xs">
                <CircleNotch size={12} className="animate-spin text-brand" />
                <span className="text-ink">{shortAgentName(running.assignee_name ?? 'Agent')}正在处理「{running.title}」</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 pb-4">
        <Composer
          disabled={!conv || busy !== null}
          onSubmit={(text, isGoal) => (isGoal ? orchestrate(text, convGoal?.id) : chat(text))}
        />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <NextImage src="/orb.png" alt="" width={72} height={72} className="rounded-[18px]" />
      <p className="text-base font-medium text-ink">说说你的目标，我来拆解任务</p>
      <p className="text-sm text-ink-3">打开「自动编排」，AI 会拆成任务并分配给合适的 Agent</p>
    </div>
  )
}

function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <CircleNotch size={24} className="animate-spin text-brand" />
    </div>
  )
}
