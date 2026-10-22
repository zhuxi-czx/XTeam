'use client'

import { Check, TreeStructure } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { AgentAvatar } from '@/components/xt/primitives'
import type { Task } from '@/lib/api'

export interface PlanStep {
  taskId: string
  title: string
  agentName: string
}

/** 执行计划：飞书消息卡片样式（浅灰细边框 + 蓝色渐变标题栏），每步只留状态、标题、Agent */
export function PlanCard({ steps, tasks }: { steps: PlanStep[]; tasks: Map<string, Task> }) {
  const doneCount = steps.filter((s) => tasks.get(s.taskId)?.status === 'completed').length

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: 'linear-gradient(90deg, #dce6ff 0%, #eef3ff 60%, #f7f9ff 100%)' }}
      >
        <TreeStructure size={16} className="text-brand-text" />
        <span className="flex-1 text-base font-semibold text-brand-text">执行计划</span>
        <span className="text-xs text-brand-text">
          {doneCount} / {steps.length} 完成
        </span>
      </div>
      {steps.map((step, i) => {
        const status = tasks.get(step.taskId)?.status ?? 'queued'
        return (
          <div
            key={step.taskId}
            className={cn(
              'flex items-center gap-3 border-line-soft px-4 py-2.5',
              i < steps.length - 1 && 'border-b',
              status === 'running' && 'bg-gradient-to-r from-brand-softer to-surface',
            )}
          >
            <StepMarker index={i + 1} status={status} />
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                status === 'queued' ? 'text-ink-2' : 'font-medium text-ink',
                status === 'failed' && 'text-danger-text',
              )}
            >
              {step.title}
            </span>
            <AgentAvatar name={step.agentName} size={20} />
          </div>
        )
      })}
    </div>
  )
}

function StepMarker({ index, status }: { index: number; status: string }) {
  if (status === 'completed') {
    return (
      <span className="flex size-[22px] items-center justify-center rounded-full bg-success text-white">
        <Check size={12} weight="bold" />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex size-[22px] items-center justify-center rounded-full text-xs',
        status === 'running' && 'bg-brand text-white',
        status === 'failed' && 'bg-danger text-white',
        (status === 'queued' || status === 'cancelled') && 'bg-fill-2 text-ink-2',
      )}
    >
      {index}
    </span>
  )
}
