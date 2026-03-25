// 工作台 - Dashboard
export default function DashboardPage() {
  return (
    <div className="flex h-full">
      {/* Main Content - 对话区 */}
      <div className="flex-1 flex flex-col border-r border-border/40">
        <div className="px-6 py-4 border-b border-border/40">
          <h2 className="text-lg font-semibold">内容增长策略讨论</h2>
          <p className="text-sm text-muted-foreground">3 位参与者 · 5 个任务 · 最近更新 2 分钟前</p>
        </div>

        {/* 消息流 */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {/* 人类消息 */}
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">张</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">创始人 · 张轩</span>
                <span className="text-xs text-muted-foreground">10:24</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-accent/50 px-4 py-3 text-sm max-w-lg">
                我们这周要把内容增长和转化链路一起拉起来，先帮我拆一下重点。
              </div>
            </div>
          </div>

          {/* AI 消息 */}
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">✦</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">AI 助手</span>
                <span className="text-xs text-muted-foreground">10:24</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-accent/30 px-4 py-3 text-sm max-w-lg space-y-2">
                <p>已根据你的目标拆分为「内容效率」「热点响应」「转化承接」三个方向。</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>内容效率：提高单篇内容的产出质量和速度</li>
                  <li>热点响应：建立快速捕捉和响应热点的机制</li>
                  <li>转化承接：优化内容到转化的完整链路</li>
                </ul>
              </div>
            </div>
          </div>

          {/* AI 建议调用 */}
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">✦</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">AI 助手</span>
                <span className="text-xs text-muted-foreground">10:25</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-accent/30 px-4 py-3 text-sm max-w-lg space-y-3">
                <p>建议调用「内容选题 Agent」和「数据复盘 Agent」先做一轮分析。</p>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs text-white hover:bg-violet-700 transition-colors">确认调用</button>
                  <button className="rounded-lg border border-border/60 px-4 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors">调整方案</button>
                </div>
              </div>
            </div>
          </div>

          {/* 任务卡片 */}
          <div className="ml-12 space-y-3">
            <p className="text-xs text-muted-foreground font-medium">已创建 2 个执行任务</p>
            <div className="grid gap-3 max-w-lg">
              <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">本轮选题分析</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">执行中</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px]">🤖</div>
                  内容选题 Agent
                </div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">执行进度</span>
                  <span className="font-medium">65%</span>
                </div>
                <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                  <div className="h-full w-[65%] rounded-full bg-violet-500 transition-all" />
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">近 14 天增长归因</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">执行中</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <div className="h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px]">🤖</div>
                  数据复盘 Agent
                </div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">执行进度</span>
                  <span className="font-medium">45%</span>
                </div>
                <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                  <div className="h-full w-[45%] rounded-full bg-purple-500 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* 人类回复 */}
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">张</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">创始人 · 张轩</span>
                <span className="text-xs text-muted-foreground">10:26</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-accent/50 px-4 py-3 text-sm max-w-lg">
                好的，现在分发。顺便看下当前爆款内容有什么共同点。
              </div>
            </div>
          </div>

          {/* Agent 分析结果 */}
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-green-500 flex items-center justify-center text-white text-sm flex-shrink-0">📊</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">内容选题 Agent</span>
                <span className="text-xs text-muted-foreground">10:28</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-accent/30 px-4 py-3 text-sm max-w-lg space-y-3">
                <p className="font-medium">已完成第一轮选题分析</p>
                <div className="bg-background/50 rounded-lg p-3 space-y-2 text-xs">
                  <p className="text-muted-foreground">根据近 14 天反馈，当前问题更可能出在内容包装，而不是选题本身。</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2"><span className="text-green-500">↑</span> 高信息密度内容点击率上升 18%</div>
                    <div className="flex items-center gap-2"><span className="text-green-500">↑</span> 封面文字简洁化后互动率提高 23%</div>
                    <div className="flex items-center gap-2"><span className="text-green-500">↑</span> 晚间发布的测评内容转化率最高</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 输入框 */}
        <div className="border-t border-border/40 px-6 py-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="描述你的目标、分配任务、或继续讨论..."
              className="flex-1 rounded-xl border border-border/60 bg-accent/20 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            <button className="rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2.5 text-sm font-medium text-white transition-colors flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              发送
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - 上下文面板 */}
      <div className="w-80 overflow-auto p-5 space-y-6">
        {/* 当前任务 */}
        <section>
          <h3 className="text-sm font-semibold mb-3">当前任务</h3>
          <div className="space-y-2">
            {[
              { title: '本轮选题分析', status: '执行中 · 65%', color: 'text-blue-500' },
              { title: '近 14 天增长归因', status: '执行中 · 45%', color: 'text-blue-500' },
              { title: '爆款结构复盘', status: '队列中', color: 'text-muted-foreground' },
            ].map((task) => (
              <div key={task.title} className="rounded-lg border border-border/40 px-3 py-2.5">
                <div className="text-sm font-medium">{task.title}</div>
                <div className={`text-xs ${task.color}`}>{task.status}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 当前参与 Agent */}
        <section>
          <h3 className="text-sm font-semibold mb-3">当前参与 Agent</h3>
          <div className="space-y-2">
            {[
              { name: '内容选题 Agent', status: '执行中', color: 'bg-green-500' },
              { name: '数据复盘 Agent', status: '执行中', color: 'bg-purple-500' },
              { name: '热点监测 Agent', status: '待命', color: 'bg-orange-500' },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors">
                <div className={`h-8 w-8 rounded-full ${agent.color} flex items-center justify-center text-white text-xs`}>🤖</div>
                <div>
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">{agent.status}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 关联目标 */}
        <section>
          <h3 className="text-sm font-semibold mb-3">关联目标</h3>
          <div className="space-y-1.5">
            {['提升内容增长效率', '稳定爆款率', '优化转化承接'].map((goal) => (
              <div key={goal} className="rounded-lg bg-violet-500/5 border border-violet-500/10 px-3 py-2 text-sm text-violet-400">
                {goal}
              </div>
            ))}
          </div>
        </section>

        {/* 相关记忆 */}
        <section>
          <h3 className="text-sm font-semibold mb-3">相关记忆</h3>
          <div className="space-y-1.5">
            {[
              '用户偏好正在偏向高信息密度内容',
              '上周封面点击率连续下降',
              '测评型内容在晚间转化更高',
            ].map((mem) => (
              <div key={mem} className="rounded-lg bg-accent/30 px-3 py-2 text-xs text-muted-foreground">
                {mem}
              </div>
            ))}
          </div>
        </section>

        {/* 待决策 */}
        <section>
          <h3 className="text-sm font-semibold mb-3">待决策</h3>
          <div className="space-y-2">
            {[
              '是否提高 AI 工具测评栏目优先级',
              '是否扩大热点内容产能',
            ].map((decision) => (
              <div key={decision} className="rounded-lg border border-border/40 px-3 py-2.5">
                <div className="text-sm mb-2">{decision}</div>
                <div className="flex gap-2">
                  <button className="rounded-md bg-violet-600 px-3 py-1 text-xs text-white hover:bg-violet-700 transition-colors">确认</button>
                  <button className="rounded-md bg-accent px-3 py-1 text-xs text-muted-foreground hover:bg-accent/80 transition-colors">稍后</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
