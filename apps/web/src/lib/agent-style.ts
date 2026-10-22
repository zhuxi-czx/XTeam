import {
  Lightbulb,
  ChartLineUp,
  PenNib,
  Binoculars,
  Fire,
  Image as ImageIcon,
  Robot,
  type Icon,
} from '@phosphor-icons/react'

// 飞书配色原则：蓝色主导，其他颜色只作点缀
const BLUE = '#3370ff'
const ORANGE = '#ff8800'
const TEAL = '#00b8a0'

const RULES: { match: RegExp; icon: Icon; color: string }[] = [
  { match: /选题/, icon: Lightbulb, color: BLUE },
  { match: /数据|复盘/, icon: ChartLineUp, color: BLUE },
  { match: /文案|撰写/, icon: PenNib, color: BLUE },
  { match: /竞品/, icon: Binoculars, color: BLUE },
  { match: /热点|监测/, icon: Fire, color: ORANGE },
  { match: /封面|设计|图/, icon: ImageIcon, color: TEAL },
]

export function agentStyle(name: string): { icon: Icon; color: string } {
  return RULES.find((r) => r.match.test(name)) ?? { icon: Robot, color: BLUE }
}

/** “内容选题 Agent” → “内容选题”：已有机器人头像和标签，名字不再重复后缀 */
export function shortAgentName(name: string): string {
  return name.replace(/\s*Agent$/i, '')
}
