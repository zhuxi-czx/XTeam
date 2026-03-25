'use client'

import { useState } from 'react'
import { Plus, Settings, Zap, MessageSquare, Code, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AgentInfo {
  id: string
  name: string
  description: string
  avatar: string
  color: string
  provider: string
  model: string
  status: 'online' | 'busy' | 'offline'
  capabilities: string[]
  tasksCompleted: number
  avgResponseTime: string
}

const mockAgents: AgentInfo[] = [
  {
    id: '1', name: '内容选题 Agent', description: '分析热点趋势，生成内容选题方向和优先级建议',
    avatar: '📊', color: 'bg-green-500', provider: 'Anthropic', model: 'Claude Sonnet',
    status: 'online', capabilities: ['数据分析', '趋势预测', '选题策划'], tasksCompleted: 142, avgResponseTime: '38s',
  },
  {
    id: '2', name: '数据复盘 Agent', description: '自动拉取和分析内容数据，生成增长归因报告',
    avatar: '📈', color: 'bg-purple-500', provider: 'OpenAI', model: 'GPT-4o',
    status: 'busy', capabilities: ['数据采集', '归因分析', '报告生成'], tasksCompleted: 89, avgResponseTime: '2m15s',
  },
  {
    id: '3', name: '热点监测 Agent', description: '7×24 小时监控全网热点，及时预警可跟进的热点',
    avatar: '🔥', color: 'bg-orange-500', provider: 'Qwen', model: 'Qwen-3.5',
    status: 'online', capabilities: ['实时监控', '热点分类', '时效性评估'], tasksCompleted: 567, avgResponseTime: '12s',
  },
  {
    id: '4', name: '文案撰写 Agent', description: '根据选题和数据生成高转化率的内容文案',
    avatar: '✍️', color: 'bg-blue-500', provider: 'Anthropic', model: 'Claude Opus',
    status: 'online', capabilities: ['文案撰写', '标题优化', 'SEO'], tasksCompleted: 203, avgResponseTime: '1m05s',
  },
  {
    id: '5', name: '封面设计 Agent', description: '自动生成和优化内容封面，A/B 测试不同方案',
    avatar: '🎨', color: 'bg-pink-500', provider: 'OpenAI', model: 'DALL·E 3',
    status: 'offline', capabilities: ['图片生成', '封面优化', 'A/B测试'], tasksCompleted: 78, avgResponseTime: '45s',
  },
  {
    id: '6', name: '竞品分析 Agent', description: '监控竞品动态，分析内容策略差异',
    avatar: '🔍', color: 'bg-cyan-500', provider: 'DeepSeek', model: 'DeepSeek-R1',
    status: 'online', capabilities: ['竞品监控', '策略分析', '差异对比'], tasksCompleted: 34, avgResponseTime: '3m20s',
  },
]

const statusMap = {
  online: { label: '在线', dot: 'bg-green-500' },
  busy: { label: '忙碌', dot: 'bg-amber-500' },
  offline: { label: '离线', dot: 'bg-gray-500' },
}

export default function AgentsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedAgent = mockAgents.find((a) => a.id === selected)
  const filtered = mockAgents.filter(
    (a) => a.name.includes(searchQuery) || a.description.includes(searchQuery)
  )

  return (
    <div className="flex h-full">
      {/* Agent 列表 */}
      <div className="w-80 border-r border-border/40 flex flex-col">
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Agent 列表</h2>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> 添加
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 Agent..."
              className="w-full rounded-lg border border-border/60 bg-accent/20 pl-9 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {filtered.map((agent) => {
            const status = statusMap[agent.status]
            return (
              <div
                key={agent.id}
                onClick={() => setSelected(agent.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                  selected === agent.id
                    ? 'bg-violet-500/10 border border-violet-500/20'
                    : 'hover:bg-accent/50 border border-transparent'
                }`}
              >
                <div className={`h-10 w-10 rounded-full ${agent.color} flex items-center justify-center text-lg flex-shrink-0`}>
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{agent.name}</span>
                    <span className={`h-2 w-2 rounded-full ${status.dot} flex-shrink-0`} />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{agent.model}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Agent 详情 */}
      {selectedAgent ? (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className={`h-16 w-16 rounded-2xl ${selectedAgent.color} flex items-center justify-center text-2xl`}>
                {selectedAgent.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-semibold">{selectedAgent.name}</h2>
                  <span className={`h-2.5 w-2.5 rounded-full ${statusMap[selectedAgent.status].dot}`} />
                  <span className="text-sm text-muted-foreground">{statusMap[selectedAgent.status].label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" /> 设置
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/40 p-4">
                <div className="text-xs text-muted-foreground mb-1">已完成任务</div>
                <div className="text-2xl font-semibold">{selectedAgent.tasksCompleted}</div>
              </div>
              <div className="rounded-xl border border-border/40 p-4">
                <div className="text-xs text-muted-foreground mb-1">平均响应</div>
                <div className="text-2xl font-semibold">{selectedAgent.avgResponseTime}</div>
              </div>
              <div className="rounded-xl border border-border/40 p-4">
                <div className="text-xs text-muted-foreground mb-1">模型</div>
                <div className="text-lg font-semibold">{selectedAgent.model}</div>
                <div className="text-xs text-muted-foreground">{selectedAgent.provider}</div>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <h3 className="text-sm font-semibold mb-3">能力标签</h3>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.capabilities.map((cap) => (
                  <span key={cap} className="rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs text-violet-400">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold mb-3">快捷操作</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center gap-3 rounded-xl border border-border/40 p-4 hover:bg-accent/50 transition-colors text-left">
                  <MessageSquare className="h-5 w-5 text-violet-400" />
                  <div>
                    <div className="text-sm font-medium">发起对话</div>
                    <div className="text-xs text-muted-foreground">直接与 Agent 对话</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 rounded-xl border border-border/40 p-4 hover:bg-accent/50 transition-colors text-left">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <div>
                    <div className="text-sm font-medium">分配任务</div>
                    <div className="text-xs text-muted-foreground">创建并分配新任务</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4 opacity-40">🤖</div>
            <p className="text-muted-foreground">选择一个 Agent 查看详情</p>
            <p className="text-xs text-muted-foreground mt-1">从左侧列表中选择或创建新 Agent</p>
          </div>
        </div>
      )}
    </div>
  )
}
