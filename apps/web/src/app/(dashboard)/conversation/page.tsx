'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageItem, type MessageData } from '@/components/conversation/message-item'
import { ChatInput } from '@/components/conversation/chat-input'
import { ContextPanel } from '@/components/conversation/context-panel'
import { conversationsApi, sendChatMessage, agentsApi, startOrchestration, tasksApi, type Message, type Agent, type Task } from '@/lib/api'
import { Loader2, Zap } from 'lucide-react'

const DEMO_CONV_TITLE = '内容增长策略讨论'
const STREAMING_ID = '__streaming__'

function toMessageData(m: Message): MessageData {
  return {
    id: m.id,
    senderName: m.sender_name,
    senderType: m.sender_type,
    senderAvatar: m.sender_type === 'human' ? '张' : m.sender_type === 'system' ? '⚙' : '✦',
    senderColor: m.sender_type === 'human' ? 'bg-violet-500' : m.sender_type === 'system' ? 'bg-amber-500' : 'bg-gradient-to-br from-violet-500 to-blue-500',
    content: m.content,
    timestamp: new Date(m.created_at + 'Z').toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function ConversationPage() {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [convId, setConvId] = useState<string | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const streamTextRef = useRef('')

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // 轮询任务（编排时用）
  const refreshTasks = useCallback(async () => {
    try {
      const list = await tasksApi.list()
      setTasks(list)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const [convs, agentList] = await Promise.all([
          conversationsApi.list(),
          agentsApi.list(),
        ])
        setAgents(agentList)

        let conv = convs.find(c => c.title === DEMO_CONV_TITLE)
        if (!conv) {
          const { id } = await conversationsApi.create({ title: DEMO_CONV_TITLE, creatorName: '创始人 · 张轩' })
          setConvId(id)
        } else {
          setConvId(conv.id)
          const msgs = await conversationsApi.messages(conv.id)
          setMessages(msgs.map(toMessageData))
        }

        await refreshTasks()
      } catch (err) {
        console.error('Init error:', err)
      }
      setLoading(false)
    }
    init()
  }, [refreshTasks])

  const handleOrchestrate = (goal: string) => {
    if (!convId) return
    setIsOrchestrating(true)

    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    // 用户目标消息
    setMessages(prev => [...prev, {
      id: `goal-${Date.now()}`,
      senderName: '创始人 · 张轩',
      senderType: 'human',
      senderAvatar: '张',
      senderColor: 'bg-violet-500',
      content: `🎯 编排目标：${goal}`,
      timestamp: now,
    }])

    // 编排状态消息
    const orchestrateStatusId = `orch-${Date.now()}`
    setMessages(prev => [...prev, {
      id: orchestrateStatusId,
      senderName: '编排引擎',
      senderType: 'system',
      senderAvatar: '⚡',
      senderColor: 'bg-amber-500',
      content: '🔄 正在规划任务...',
      timestamp: now,
    }])

    const createdTasks: string[] = []

    startOrchestration(convId, goal, {
      onStart: () => {
        setMessages(prev => prev.map(m =>
          m.id === orchestrateStatusId ? { ...m, content: '🧠 AI 正在分析目标、拆解子任务...' } : m
        ))
      },
      onTaskCreated: (taskId, title, agentName) => {
        createdTasks.push(`📋 **${title}** → 🤖 ${agentName}`)
        setMessages(prev => prev.map(m =>
          m.id === orchestrateStatusId
            ? { ...m, content: `⚡ 编排进行中...\n\n${createdTasks.join('\n')}` }
            : m
        ))
        refreshTasks()
      },
      onTaskProgress: (taskId, progress) => {
        refreshTasks()
      },
      onDone: (taskCount, summary) => {
        setMessages(prev => prev.map(m =>
          m.id === orchestrateStatusId
            ? { ...m, content: `✅ **编排完成** — ${taskCount} 个任务已执行\n\n${createdTasks.join('\n')}\n\n---\n\n${summary.slice(0, 800)}` }
            : m
        ))
        setIsOrchestrating(false)
        refreshTasks()
      },
      onError: (error) => {
        setMessages(prev => prev.map(m =>
          m.id === orchestrateStatusId
            ? { ...m, content: `❌ 编排失败：${error}` }
            : m
        ))
        setIsOrchestrating(false)
      },
    })
  }

  const handleSend = (text: string) => {
    if (!convId) return

    // 检测编排指令
    if (text.startsWith('/目标 ') || text.startsWith('/goal ')) {
      const goal = text.replace(/^\/(目标|goal)\s+/, '')
      handleOrchestrate(goal)
      return
    }

    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    setMessages(prev => [...prev, {
      id: `u-${Date.now()}`,
      senderName: '创始人 · 张轩',
      senderType: 'human',
      senderAvatar: '张',
      senderColor: 'bg-violet-500',
      content: text,
      timestamp: now,
    }])

    setIsStreaming(true)
    streamTextRef.current = ''

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: STREAMING_ID,
        senderName: 'AI 助手',
        senderType: 'agent',
        senderAvatar: '✦',
        senderColor: 'bg-gradient-to-br from-violet-500 to-blue-500',
        content: '',
        timestamp: now,
      }])
    }, 200)

    sendChatMessage(convId, text, '创始人 · 张轩', {
      onChunk: (chunk) => {
        streamTextRef.current += chunk
        const current = streamTextRef.current
        setMessages(prev => prev.map(m => m.id === STREAMING_ID ? { ...m, content: current } : m))
      },
      onDone: (msgId, fullContent) => {
        setMessages(prev => prev.map(m => m.id === STREAMING_ID ? { ...m, id: msgId, content: fullContent } : m))
        setIsStreaming(false)
      },
      onError: (error) => {
        const fallback = `[连接错误] ${error}\n\n请确认 XTeam Server 正常运行。`
        setMessages(prev => prev.map(m => m.id === STREAMING_ID ? { ...m, id: `err-${Date.now()}`, content: fallback } : m))
        setIsStreaming(false)
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{DEMO_CONV_TITLE}</h2>
            <p className="text-sm text-muted-foreground">{messages.length} 条消息 · {tasks.filter(t => t.status === 'running').length} 个任务执行中</p>
          </div>
          {isOrchestrating && (
            <div className="flex items-center gap-2 text-amber-500 text-sm">
              <Zap className="h-4 w-4 animate-pulse" />
              编排中...
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {messages.length === 0 && !isStreaming && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-3xl mb-3">💬</div>
                <p>发送消息开始对话</p>
                <p className="text-xs mt-2 opacity-60">输入 <code className="bg-muted px-1 rounded">/目标 你的目标</code> 启动 AI 编排</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}

          {isStreaming && messages.find(m => m.id === STREAMING_ID)?.content === '' && (
            <div className="flex items-center gap-2 ml-12 text-xs text-muted-foreground">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              AI 助手正在回复...
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={isStreaming || isOrchestrating || !convId} />
      </div>

      <ContextPanel
        tasks={tasks.slice(0, 10).map(t => ({
          title: t.title,
          status: t.status,
          progress: t.progress,
          agentName: t.assignee_name || undefined,
        }))}
        agents={agents.filter(a => a.status === 'online').map(a => ({ name: a.name, status: '在线', color: `bg-[${a.color}]` }))}
        goals={['提升内容增长效率', '稳定爆款率']}
        memories={['用户偏好偏向高信息密度内容', '测评型内容在晚间转化更高']}
        decisions={[]}
      />
    </div>
  )
}
