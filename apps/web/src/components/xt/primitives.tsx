'use client'

import NextImage from 'next/image'
import { Sparkle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { agentStyle } from '@/lib/agent-style'

/** Agent 头像：圆形纯色底 + 白色实心图标（飞书机器人头像样式） */
export function AgentAvatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const { icon: Icon, color } = agentStyle(name)
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', className)}
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <Icon weight="fill" color="#fff" size={Math.round(size * 0.55)} />
    </span>
  )
}

/** 编排助手头像：飞书 AI 的蓝 → 紫 → 珊瑚渐变 */
export function OrchestratorAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #4e83fd 0%, #8d6cf0 60%, #ff8d76 100%)' }}
    >
      <Sparkle weight="fill" color="#fff" size={Math.round(size * 0.5)} />
    </span>
  )
}

export const ME = { name: '张轩', role: '创始人', avatar: '/avatars/me.jpg' }

export function MyAvatar({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <NextImage
      src={ME.avatar}
      alt={ME.name}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full object-cover object-top', className)}
      style={{ width: size, height: size }}
    />
  )
}

type TagTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'bot'

const TAG_TONES: Record<TagTone, string> = {
  brand: 'bg-brand-soft text-brand-text',
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
  neutral: 'bg-fill-2 text-ink-2',
  bot: 'bg-bot-soft text-bot-text',
}

/** 飞书小方角标签，不带圆点 */
export function Tag({ tone = 'neutral', children }: { tone?: TagTone; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex h-5 shrink-0 items-center rounded px-1.5 text-xs leading-none', TAG_TONES[tone])}>
      {children}
    </span>
  )
}

export function BotTag() {
  return <Tag tone="bot">机器人</Tag>
}

export const btn = {
  primary:
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-sm text-white transition-colors hover:bg-brand-hover disabled:opacity-40',
  secondary:
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm text-ink transition-colors hover:bg-fill disabled:opacity-40',
  icon: 'inline-flex size-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-fill-2',
}

export const TASK_STATUS: Record<string, { label: string; tone: TagTone }> = {
  queued: { label: '排队中', tone: 'neutral' },
  running: { label: '执行中', tone: 'brand' },
  completed: { label: '已完成', tone: 'success' },
  failed: { label: '失败', tone: 'danger' },
  cancelled: { label: '已取消', tone: 'neutral' },
}
