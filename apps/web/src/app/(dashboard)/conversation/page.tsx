'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageItem, type MessageData } from '@/components/conversation/message-item'
import { ChatInput } from '@/components/conversation/chat-input'
import { ContextPanel } from '@/components/conversation/context-panel'
import { conversationsApi, sendChatMessage, agentsApi, type Message, type Agent } from '@/lib/api'
import { Loader2 } from 'lucide-react'

const DEMO_CONV_TITLE = '内容增长策略讨论'
const STREAMING_ID = '__streaming__'

function toMessageData(m: Message): MessageData {
  return {
    id: m.id,
    senderName: m.sender_name,
    senderType: m.sender_type,
    senderAvatar: m.sender_type === 'human' ? '张' : '✦',
    senderColor: m.sender_type === 'human' ? 'bg-violet-500' : 'bg-gradient-to-br from-violet-500 to-blue-500',
    content: m.content,
    timestamp: new Date(m.created_at + 'Z').toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function ConversationPage() {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [convId, setConvId] = useState<string | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
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
      } catch (err) {
        console.error('Init error:', err)
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSend = (text: string) => {
    if (!convId) return

    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    // 用户消息
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

    // AI 占位
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
        const fallback = `[连接错误] ${error}\n\n这通常是因为 Server 无法连接到 LLM Gateway。请确认 OpenClaw Gateway 在 127.0.0.1:18789 运行。`
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
        <div className="px-6 py-4 border-b border-border/40">
          <h2 className="text-lg font-semibold">{DEMO_CONV_TITLE}</h2>
          <p className="text-sm text-muted-foreground">{messages.length} 条消息</p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {messages.length === 0 && !isStreaming && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-3xl mb-3">💬</div>
                <p>发送第一条消息开始对话</p>
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

        <ChatInput onSend={handleSend} disabled={isStreaming || !convId} />
      </div>

      <ContextPanel
        tasks={[]}
        agents={agents.filter(a => a.status === 'online').map(a => ({ name: a.name, status: a.status === 'online' ? '在线' : '离线', color: `bg-[${a.color}]` }))}
        goals={['提升内容增长效率', '稳定爆款率']}
        memories={['用户偏好偏向高信息密度内容', '测评型内容在晚间转化更高']}
        decisions={[]}
      />
    </div>
  )
}
