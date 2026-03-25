'use client'

import { Bot, AlertCircle, Plus, MessageSquare, UserPlus, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border/40 px-6">
      {/* Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">运行稳定</span>
        </div>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">在线 Agent</span>
          <span className="text-sm font-semibold">8</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-muted-foreground">待确认</span>
          <span className="text-sm font-semibold">3</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          新建对话
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          指派 Agent
        </Button>
        <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
          <ListTodo className="h-3.5 w-3.5" />
          创建任务
        </Button>
      </div>
    </header>
  )
}
