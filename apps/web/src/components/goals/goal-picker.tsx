'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CaretDown, Check, Target, ArrowRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Goal } from '@/lib/api'

/**
 * 选择关联目标。
 * - toolbar：输入框工具栏里，发起编排前选择
 * - pill：对话页顶栏，给已有对话关联/更换/取消目标；viewHref 提供“查看目标进度”入口
 * 列表只放进行中的目标，但当前已选的目标即使已达成/暂停也会保留
 */
export function GoalPicker({
  goals,
  value,
  onChange,
  variant = 'toolbar',
  viewHref,
}: {
  goals: Goal[]
  value: string | null
  onChange: (id: string | null) => void
  variant?: 'toolbar' | 'pill'
  viewHref?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = goals.find((g) => g.id === value)
  const options = goals.filter((g) => g.status === 'active' || g.id === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (options.length === 0) return null

  const label = selected ? (variant === 'pill' ? selected.title : `关联目标：${selected.title}`) : '关联目标'

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex max-w-[280px] items-center gap-1 text-xs transition-colors',
          variant === 'pill'
            ? 'h-6 rounded-full bg-fill-2 px-2 text-ink-2 hover:bg-brand-soft hover:text-brand-text'
            : cn('h-6 rounded-md px-2', selected ? 'bg-fill-2 text-ink' : 'text-ink-2 hover:bg-fill-2'),
        )}
      >
        <Target size={variant === 'pill' ? 12 : 14} className={cn('shrink-0', (selected || variant === 'pill') && 'text-brand')} />
        <span className="truncate">{label}</span>
        <CaretDown size={10} className="shrink-0 text-ink-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 w-72 rounded-lg border border-line bg-surface p-1 shadow-[0_6px_18px_rgba(31,35,41,0.08)]">
          {viewHref && selected && (
            <>
              <Link
                href={viewHref}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-brand-text hover:bg-brand-softer"
              >
                <span className="flex-1">查看目标进度</span>
                <ArrowRight size={14} />
              </Link>
              <div className="mx-2.5 my-1 h-px bg-line-soft" />
            </>
          )}
          {[{ id: null, title: '不关联目标' }, ...options].map((g) => (
            <button
              key={g.id ?? 'none'}
              type="button"
              onClick={() => {
                setOpen(false)
                if (g.id !== value) onChange(g.id)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ink hover:bg-fill"
            >
              <span className={cn('flex-1 truncate', g.id === null && 'text-ink-2')}>{g.title}</span>
              {value === g.id && <Check size={14} className="text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
