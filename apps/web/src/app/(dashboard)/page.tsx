'use client'

import { useEffect, useState } from 'react'
import NextImage from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WarningCircle, FileText } from '@phosphor-icons/react'
import { Composer } from '@/components/xt/composer'
import { btn, ME } from '@/components/xt/primitives'
import { conversationsApi, tasksApi, type Task } from '@/lib/api'

const SUGGESTIONS = ['📊 复盘上周的内容数据', '💡 策划下周 5 篇选题', '🔍 盯一下竞品这周的动作']

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export default function HomePage() {
  const router = useRouter()
  const [draft, setDraft] = useState('')
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    tasksApi.list().then(setTasks).catch(() => setTasks([]))
  }, [])

  const failed = tasks?.filter((t) => t.status === 'failed') ?? []
  const done = tasks?.filter((t) => t.status === 'completed').slice(0, 3) ?? []
  const todo = [...failed, ...done]

  const startGoal = async (goal: string) => {
    setStarting(true)
    try {
      const title = goal.replace(/^\p{Extended_Pictographic}\s*/u, '').slice(0, 24)
      const { id } = await conversationsApi.create({ title, creatorName: ME.name })
      router.push(`/conversation?id=${id}&goal=${encodeURIComponent(goal)}`)
    } catch {
      setStarting(false)
    }
  }

  const subtitle =
    tasks === null
      ? ' '
      : failed.length > 0
        ? `有 ${failed.length} 件事需要你看一下`
        : todo.length > 0
          ? `有 ${todo.length} 个新结果等你过目`
          : '一切就绪，说说今天的目标吧'

  return (
    <div
      className="flex flex-1 justify-center overflow-y-auto px-12 pb-6 pt-16"
      style={{ background: 'linear-gradient(180deg, #e8efff 0%, #ffffff 45%)' }}
    >
      <div className="flex w-full max-w-[760px] flex-col gap-10">
        <section className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              {/* 问候语取决于本地时间，可能与服务端预渲染不同 */}
              <h1 suppressHydrationWarning className="text-[28px] font-semibold leading-tight text-ink">
                {greeting()}，{ME.name} 👋
              </h1>
              <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>
            </div>
            <NextImage src="/orb.png" alt="" width={80} height={80} className="rounded-[20px]" priority />
          </div>

          <Composer
            lockOrchestrate
            minRows={2}
            value={draft}
            onValueChange={setDraft}
            disabled={starting}
            onSubmit={(text) => startGoal(text)}
          />

          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDraft(s)}
                className="h-7 rounded-full bg-[#1f23290a] px-3 text-xs text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand-text"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {tasks !== null && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-ink">需要你处理</h2>
            {todo.length === 0 ? (
              <div className="rounded-xl bg-fill px-4 py-8 text-center text-sm text-ink-3">
                暂时没有要处理的事 ✨
              </div>
            ) : (
              <div className="flex flex-col rounded-xl bg-fill py-2">
                {todo.map((t) => (
                  <TodoRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function TodoRow({ task }: { task: Task }) {
  const failed = task.status === 'failed'
  const Icon = failed ? WarningCircle : FileText
  const href = task.conversation_id ? `/conversation?id=${task.conversation_id}` : '/tasks'
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${failed ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}`}
      >
        <Icon size={16} weight="fill" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink">
        {failed ? `${task.title} 失败了` : `${task.title} 已完成`}
      </span>
      <Link href={href} className={failed ? btn.primary : btn.secondary}>
        查看
      </Link>
    </div>
  )
}
