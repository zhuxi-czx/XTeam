'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CaretDown,
  CheckCircle,
  ChatsCircle,
  CircleNotch,
  DotsThree,
  PauseCircle,
  Plus,
  Target,
  X,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { AgentAvatar, Tag, btn } from '@/components/xt/primitives'
import { StepMarker } from '@/components/conversation/plan-card'
import { goalsApi, type Goal, type Task } from '@/lib/api'

const STATUS = {
  active: { label: '进行中', tone: 'brand' as const, icon: Target, iconBg: 'bg-brand-soft text-brand', bar: 'from-[#82a7fc] to-brand' },
  achieved: { label: '已达成', tone: 'success' as const, icon: CheckCircle, iconBg: 'bg-success-soft text-success', bar: 'from-[#7ed07a] to-success' },
  paused: { label: '已暂停', tone: 'neutral' as const, icon: PauseCircle, iconBg: 'bg-line-soft text-ink-3', bar: 'from-ink-3 to-ink-3' },
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <GoalsView />
    </Suspense>
  )
}

function GoalsView() {
  const openParam = useSearchParams().get('open')
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(openParam)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      setGoals(await goalsApi.list())
    } catch {
      setGoals((g) => g ?? [])
    }
  }, [])

  useEffect(() => {
    goalsApi.list().then(setGoals).catch(() => setGoals([]))
  }, [])

  if (!goals) return <Spinner />

  const activeCount = goals.filter((g) => g.status === 'active').length

  return (
    <div className="flex flex-1 justify-center overflow-y-auto px-12 py-6">
      <div className="flex w-full max-w-[820px] flex-col gap-5">
        <header className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">目标</h1>
          {activeCount > 0 && <span className="text-sm text-ink-3">{activeCount} 个进行中</span>}
          <div className="flex-1" />
          {goals.length > 0 && (
            <button type="button" className={btn.primary} onClick={() => setCreating(true)}>
              <Plus size={14} weight="bold" />
              新建目标
            </button>
          )}
        </header>

        {goals.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-20 text-center">
            <NextImage src="/orb.png" alt="" width={96} height={96} className="rounded-3xl" />
            <p className="text-lg font-semibold text-ink">还没有目标</p>
            <p className="text-sm text-ink-3">定一个目标，发起编排时关联上，进度会自动更新</p>
            <button type="button" className={cn(btn.primary, 'mt-2')} onClick={() => setCreating(true)}>
              <Plus size={14} weight="bold" />
              新建第一个目标
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                open={openId === g.id}
                onToggle={() => setOpenId((id) => (id === g.id ? null : g.id))}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <CreateGoalModal
          onClose={() => setCreating(false)}
          onCreated={async (id) => {
            setCreating(false)
            await load()
            setOpenId(id)
          }}
        />
      )}
    </div>
  )
}

function GoalCard({ goal, open, onToggle, onChanged }: { goal: Goal; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const s = STATUS[goal.status]
  const Icon = s.icon

  return (
    <div className={cn('overflow-hidden rounded-xl', open ? 'border border-line bg-surface' : 'bg-fill')}>
      <div
        className="flex cursor-pointer flex-col gap-3 px-5 py-4"
        style={open ? { background: 'linear-gradient(90deg, #e6eeff 0%, #f3f6ff 60%, #ffffff 100%)' } : undefined}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', open && goal.status === 'active' ? 'bg-brand text-white' : s.iconBg)}
          >
            <Icon size={18} weight="fill" />
          </span>
          <span className={cn('min-w-0 flex-1 truncate text-base font-semibold', goal.status === 'paused' ? 'text-ink-2' : 'text-ink')}>
            {goal.title}
          </span>
          <Tag tone={s.tone}>{s.label}</Tag>
          <GoalMenu goal={goal} onChanged={onChanged} />
          <CaretDown size={16} className={cn('text-ink-3 transition-transform', open && 'rotate-180')} />
        </div>
        <div className="flex items-center gap-3 pl-11">
          <div className={cn('h-1.5 flex-1 overflow-hidden rounded-full', open ? 'bg-surface' : 'bg-[#e4e6ea]')}>
            <div className={cn('h-full rounded-full bg-gradient-to-r transition-all', s.bar)} style={{ width: `${goal.progress}%` }} />
          </div>
          <span className={cn('w-10 text-right text-sm font-semibold tabular-nums', goal.status === 'paused' ? 'text-ink-3' : 'text-ink')}>
            {goal.progress}%
          </span>
          <span className="w-16 text-right text-xs text-ink-3">
            {goal.task_done} / {goal.task_total} 任务
          </span>
        </div>
      </div>

      {open && <GoalTasks goal={goal} />}
    </div>
  )
}

function GoalTasks({ goal }: { goal: Goal }) {
  const [tasks, setTasks] = useState<Task[] | null>(null)

  useEffect(() => {
    goalsApi
      .get(goal.id)
      .then((d) => setTasks(d.tasks))
      .catch(() => setTasks([]))
  }, [goal.id, goal.task_done, goal.task_total])

  if (!tasks) {
    return (
      <div className="flex justify-center py-4">
        <CircleNotch size={16} className="animate-spin text-brand" />
      </div>
    )
  }

  const convCount = goal.conversation_ids.length

  return (
    <>
      {tasks.length === 0 ? (
        <p className="px-5 py-4 text-sm text-ink-3">还没有关联任务。在工作台发起编排时选择这个目标，拆出的任务会出现在这里。</p>
      ) : (
        tasks.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 border-t border-line-soft px-5 py-2.5',
              t.status === 'running' && 'bg-gradient-to-r from-brand-softer to-surface',
            )}
          >
            <StepMarker index={i + 1} status={t.status} />
            <span className={cn('min-w-0 flex-1 truncate text-sm', t.status === 'queued' ? 'text-ink-2' : 'font-medium text-ink')}>
              {t.title}
            </span>
            {t.assignee_name && <AgentAvatar name={t.assignee_name} size={20} />}
          </div>
        ))
      )}
      {convCount > 0 && (
        <div className="flex items-center gap-1.5 bg-[#f7f8fa] px-5 py-2.5 text-xs">
          <ChatsCircle size={14} className="text-ink-3" />
          <span className="flex-1 text-ink-3">来自 {convCount} 个对话</span>
          <Link href={`/conversation?id=${goal.conversation_ids[0]}`} className="text-brand-text hover:underline">
            在对话中查看 →
          </Link>
        </div>
      )}
    </>
  )
}

function GoalMenu({ goal, onChanged }: { goal: Goal; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const act = async (fn: () => Promise<unknown>) => {
    setOpen(false)
    try {
      await fn()
    } finally {
      onChanged()
    }
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="更多操作" className="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-white/70" onClick={() => setOpen((o) => !o)}>
        <DotsThree size={18} weight="bold" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-32 rounded-lg border border-line bg-surface p-1 shadow-[0_6px_18px_rgba(31,35,41,0.08)]">
          <button
            type="button"
            className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-ink hover:bg-fill"
            onClick={() => act(() => goalsApi.update(goal.id, { status: goal.status === 'paused' ? 'active' : 'paused' }))}
          >
            {goal.status === 'paused' ? '恢复' : '暂停'}
          </button>
          <button
            type="button"
            className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-danger-text hover:bg-danger-soft"
            onClick={() => {
              if (window.confirm(`删除目标「${goal.title}」？关联的任务会保留，只是不再属于这个目标。`)) {
                act(() => goalsApi.delete(goal.id))
              } else {
                setOpen(false)
              }
            }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  )
}

function CreateGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const { id } = await goalsApi.create({ title: title.trim(), description: description.trim() || undefined })
      onCreated(id)
    } catch {
      setError('创建失败，请确认 XTeam Server 正在运行')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-[480px] flex-col gap-5 rounded-xl bg-surface p-6 shadow-[0_8px_24px_8px_rgba(31,35,41,0.06)]"
      >
        <div className="flex items-center">
          <h2 className="flex-1 text-lg font-semibold text-ink">新建目标</h2>
          <button type="button" aria-label="关闭" onClick={onClose} className="text-ink-3 hover:text-ink-2">
            <X size={18} />
          </button>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">目标名称</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="比如：本周拉起内容增长与转化链路"
            className="h-10 rounded-md border border-line px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">
            补充说明 <span className="text-xs font-normal text-ink-3">可选</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="想达成什么结果？AI 拆解任务时会参考这里"
            className="resize-none rounded-md border border-line px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>
        {error && <p className="text-sm text-danger-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn.secondary} onClick={onClose}>
            取消
          </button>
          <button type="submit" className={btn.primary} disabled={!title.trim() || saving}>
            {saving ? '创建中…' : '创建'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <CircleNotch size={24} className="animate-spin text-brand" />
    </div>
  )
}
