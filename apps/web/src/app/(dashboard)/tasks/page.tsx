'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, CheckCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { tasksApi, type Task } from '@/lib/api'

const columns = [
  { key: 'queued', label: '队列中', icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  { key: 'running', label: '执行中', icon: PlayCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'completed', label: '已完成', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  { key: 'failed', label: '失败', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tasksApi.list().then((data) => {
      setTasks(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">任务看板</h2>
          <p className="text-sm text-muted-foreground">{tasks.length} 个任务</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
          <Plus className="h-3.5 w-3.5" /> 创建任务
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 gap-4 h-full">
          {columns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.key)
            const Icon = col.icon
            return (
              <div key={col.key} className="flex flex-col">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Icon className={`h-4 w-4 ${col.color}`} />
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{colTasks.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 min-h-[200px]">
                  {colTasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/40 p-6 text-center">
                      <p className="text-xs text-muted-foreground">暂无任务</p>
                    </div>
                  )}
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/30 transition-colors cursor-pointer"
                    >
                      <h4 className="text-sm font-semibold mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                      )}
                      {task.assignee_name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <span>🤖</span>
                          <span>{task.assignee_name}</span>
                        </div>
                      )}
                      {task.status === 'running' && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">进度</span>
                            <span className="font-medium">{task.progress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                            <div
                              className="h-full rounded-full bg-violet-500 transition-all duration-500"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {task.result && task.status === 'completed' && (
                        <p className="text-xs text-green-400 mt-2 line-clamp-2">{task.result}</p>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-2">
                        {new Date(task.created_at + 'Z').toLocaleString('zh-CN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
