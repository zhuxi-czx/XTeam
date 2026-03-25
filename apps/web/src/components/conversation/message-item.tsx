'use client'

import { cn } from '@/lib/utils'

export interface MessageData {
  id: string
  senderName: string
  senderType: 'human' | 'agent' | 'system'
  senderAvatar: string
  senderColor: string
  content: string
  timestamp: string
  actions?: { label: string; variant: 'primary' | 'secondary' }[]
}

export function MessageItem({ message }: { message: MessageData }) {
  const isHuman = message.senderType === 'human'

  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0',
          message.senderColor
        )}
      >
        {message.senderAvatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{message.senderName}</span>
          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-2xl',
            isHuman ? 'bg-accent/50' : 'bg-accent/30'
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          {message.actions && message.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {message.actions.map((action) => (
                <button
                  key={action.label}
                  className={cn(
                    'rounded-lg px-4 py-1.5 text-xs transition-colors',
                    action.variant === 'primary'
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'border border-border/60 text-muted-foreground hover:bg-accent'
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
