'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { PaperPlaneRight, TreeStructure } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface ComposerProps {
  onSubmit: (text: string, orchestrate: boolean) => void
  disabled?: boolean
  /** 自动编排的初始状态；lockOrchestrate 时固定开启（首页只用来发起目标） */
  defaultOrchestrate?: boolean
  lockOrchestrate?: boolean
  value?: string
  onValueChange?: (v: string) => void
  minRows?: number
  className?: string
  /** 放在“自动编排”右侧的额外控件，例如关联目标 */
  toolbarExtra?: React.ReactNode
}

export function Composer({
  onSubmit,
  disabled,
  defaultOrchestrate = false,
  lockOrchestrate = false,
  value: controlled,
  onValueChange,
  minRows = 1,
  className,
  toolbarExtra,
}: ComposerProps) {
  const [inner, setInner] = useState('')
  const [orchestrate, setOrchestrate] = useState(defaultOrchestrate || lockOrchestrate)
  const ref = useRef<HTMLTextAreaElement>(null)
  const value = controlled ?? inner
  const setValue = onValueChange ?? setInner

  // 随内容自动增高，最多 8 行
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 8 * 22)}px`
  }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSubmit(text, orchestrate)
    setValue('')
  }

  const placeholder = lockOrchestrate
    ? '今天想推进什么？'
    : orchestrate
      ? '描述目标，AI 会拆成任务并分配给 Agent'
      : '说点什么…'

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 pb-3 pt-3.5 transition-colors focus-within:border-brand-line',
        orchestrate && 'border-brand-line',
        className,
      )}
    >
      <textarea
        ref={ref}
        rows={minRows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent text-[15px] leading-[22px] text-ink outline-none placeholder:text-ink-3"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={lockOrchestrate}
          onClick={() => setOrchestrate((o) => !o)}
          aria-pressed={orchestrate}
          className={cn(
            'inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs transition-colors',
            orchestrate ? 'bg-brand-soft text-brand-text' : 'text-ink-2 hover:bg-fill-2',
          )}
        >
          <TreeStructure size={14} weight={orchestrate ? 'fill' : 'regular'} />
          自动编排
        </button>
        {toolbarExtra}
        <div className="flex-1" />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="发送"
          className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-brand/40"
        >
          <PaperPlaneRight size={16} weight="fill" />
        </button>
      </div>
    </div>
  )
}
