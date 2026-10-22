'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretDown, Check, Target } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Goal } from '@/lib/api'

/** 发起编排时选择要挂靠的目标；只列出进行中的目标 */
export function GoalPicker({
  goals,
  value,
  onChange,
}: {
  goals: Goal[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = goals.filter((g) => g.status === 'active')
  const selected = goals.find((g) => g.id === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (active.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-6 max-w-[260px] items-center gap-1 rounded-md px-2 text-xs transition-colors',
          selected ? 'bg-fill-2 text-ink' : 'text-ink-2 hover:bg-fill-2',
        )}
      >
        <Target size={14} className={selected ? 'text-brand' : undefined} />
        <span className="truncate">{selected ? `关联目标：${selected.title}` : '关联目标'}</span>
        <CaretDown size={12} className="shrink-0 text-ink-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 w-72 rounded-lg border border-line bg-surface p-1 shadow-[0_6px_18px_rgba(31,35,41,0.08)]">
          {[{ id: null, title: '不关联目标' }, ...active].map((g) => (
            <button
              key={g.id ?? 'none'}
              type="button"
              onClick={() => {
                onChange(g.id)
                setOpen(false)
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
