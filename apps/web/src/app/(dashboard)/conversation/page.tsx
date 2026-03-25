'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageItem, type MessageData } from '@/components/conversation/message-item'
import { TaskCard, type TaskCardData } from '@/components/conversation/task-card'
import { ChatInput } from '@/components/conversation/chat-input'
import { ContextPanel } from '@/components/conversation/context-panel'

// 模拟初始消息
const initialMessages: MessageData[] = [
  {
    id: '1',
    senderName: '创始人 · 张轩',
    senderType: 'human',
    senderAvatar: '张',
    senderColor: 'bg-violet-500',
    content: '我们这周要把内容增长和转化链路一起拉起来，先帮我拆一下重点。',
    timestamp: '10:24',
  },
  {
    id: '2',
    senderName: 'AI 助手',
    senderType: 'agent',
    senderAvatar: '✦',
    senderColor: 'bg-gradient-to-br from-violet-500 to-blue-500',
    content: '已根据你的目标拆分为「内容效率」「热点响应」「转化承接」三个方向。\n\n• 内容效率：提高单篇内容的产出质量和速度\n• 热点响应：建立快速捕捉和响应热点的机制\n• 转化承接：优化内容到转化的完整链路',
    timestamp: '10:24',
  },
  {
    id: '3',
    senderName: 'AI 助手',
    senderType: 'agent',
    senderAvatar: '✦',
    senderColor: 'bg-gradient-to-br from-violet-500 to-blue-500',
    content: '建议调用「内容选题 Agent」和「数据复盘 Agent」先做一轮分析。',
    timestamp: '10:25',
    actions: [
      { label: '确认调用', variant: 'primary' },
      { label: '调整方案', variant: 'secondary' },
    ],
  },
]

const initialTasks: TaskCardData[] = [
  { id: 't1', title: '本轮选题分析', agentName: '内容选题 Agent', agentColor: 'bg-green-500', status: 'running', progress: 65, expectedOutput: '选题方向 + 优先级建议' },
  { id: 't2', title: '近 14 天增长归因', agentName: '数据复盘 Agent', agentColor: 'bg-purple-500', status: 'running', progress: 45, expectedOutput: '增长数据分析报告' },
]

// 模拟 AI 流式响应
const simulateStream = (text: string, onChunk: (chunk: string) => void, onDone: () => void) => {
  let i = 0
  const interval = setInterval(() => {
    if (i < text.length) {
      const chunkSize = Math.floor(Math.random() * 3) + 1
      onChunk(text.slice(i, i + chunkSize))
      i += chunkSize
    } else {
      clearInterval(interval)
      onDone()
    }
  }, 30)
}

export default function ConversationPage() {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages)
  const [tasks] = useState<TaskCardData[]>(initialTasks)
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = (text: string) => {
    // 添加用户消息
    const userMsg: MessageData = {
      id: `msg-${Date.now()}`,
      senderName: '创始人 · 张轩',
      senderType: 'human',
      senderAvatar: '张',
      senderColor: 'bg-violet-500',
      content: text,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userMsg])

    // 模拟 AI 流式响应
    setIsStreaming(true)
    const aiMsgId = `msg-${Date.now() + 1}`
    const aiMsg: MessageData = {
      id: aiMsgId,
      senderName: 'AI 助手',
      senderType: 'agent',
      senderAvatar: '✦',
      senderColor: 'bg-gradient-to-br from-violet-500 to-blue-500',
      content: '',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, aiMsg])

      const responseText = `收到。我会分析你的需求并制定方案。\n\n根据当前上下文，建议从以下几个方面入手：\n\n1. 先让「数据复盘 Agent」拉取最近 7 天的核心指标\n2. 同时让「内容选题 Agent」分析当前热门话题\n3. 汇总两个 Agent 的分析后，生成行动方案\n\n需要我立即执行吗？`

      simulateStream(
        responseText,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
            )
          )
        },
        () => {
          setIsStreaming(false)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    actions: [
                      { label: '确认执行', variant: 'primary' as const },
                      { label: '调整方案', variant: 'secondary' as const },
                    ],
                  }
                : m
            )
          )
        }
      )
    }, 800)
  }

  return (
    <div className="flex h-full">
      {/* 对话区 */}
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-border/40">
          <h2 className="text-lg font-semibold">内容增长策略讨论</h2>
          <p className="text-sm text-muted-foreground">3 位参与者 · 5 个任务 · 最近更新 2 分钟前</p>
        </div>

        {/* 消息流 */}
        <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}

          {/* 任务卡片区 */}
          {tasks.length > 0 && (
            <div className="ml-12 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">
                已创建 {tasks.length} 个执行任务
              </p>
              <div className="grid gap-3 max-w-lg">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-2 ml-12 text-xs text-muted-foreground">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              AI 助手正在思考...
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>

      {/* 右侧上下文面板 */}
      <ContextPanel
        tasks={[
          { title: '本轮选题分析', status: '执行中 · 65%', color: 'text-blue-500' },
          { title: '近 14 天增长归因', status: '执行中 · 45%', color: 'text-blue-500' },
          { title: '爆款结构复盘', status: '队列中', color: 'text-muted-foreground' },
        ]}
        agents={[
          { name: '内容选题 Agent', status: '执行中', color: 'bg-green-500' },
          { name: '数据复盘 Agent', status: '执行中', color: 'bg-purple-500' },
          { name: '热点监测 Agent', status: '待命', color: 'bg-orange-500' },
        ]}
        goals={['提升内容增长效率', '稳定爆款率', '优化转化承接']}
        memories={[
          '用户偏好正在偏向高信息密度内容',
          '上周封面点击率连续下降',
          '测评型内容在晚间转化更高',
        ]}
        decisions={[
          '是否提高 AI 工具测评栏目优先级',
          '是否扩大热点内容产能',
        ]}
      />
    </div>
  )
}
