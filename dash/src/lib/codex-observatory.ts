type ProjectInput = {
  name: string
  cost: number
  sessions: number
  avgCostPerSession?: number
  sessionCountBasis?: 'identity' | 'partial'
}

type ModelInput = {
  name: string
  inputTokens: number
  outputTokens: number
  calls: number
  cost: number
}

type DayInput = {
  date: string
  inputTokens: number
  outputTokens: number
  topModels: ModelInput[]
}

type ObservatoryInput = {
  current: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    sessions: number
    calls: number
    cost: number
    topProjects: ProjectInput[]
  }
  daily: DayInput[]
}

type DashboardPeriod = 'today' | 'week' | '30days' | 'month' | 'all' | 'lifetime'

function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function selectDailyForPeriod<T extends { date: string }>(daily: T[], period: DashboardPeriod, today = isoDate(new Date())): T[] {
  if (period === 'lifetime') return daily

  const end = new Date(`${today}T12:00:00`)
  const start = new Date(end)
  if (period === 'today') return daily.filter((day) => day.date === today)
  if (period === 'month') start.setDate(1)
  else start.setDate(start.getDate() - (period === 'week' ? 6 : period === '30days' ? 29 : 182))

  const firstDate = isoDate(start)
  return daily.filter((day) => day.date >= firstDate && day.date <= today)
}

export function buildCodexObservatory({ current, daily }: ObservatoryInput) {
  const totalTokens = current.inputTokens + current.outputTokens
  const models = new Map<string, { tokens: number; calls: number }>()

  for (const day of daily) {
    for (const model of day.topModels) {
      const previous = models.get(model.name) ?? { tokens: 0, calls: 0 }
      previous.tokens += model.inputTokens + model.outputTokens
      previous.calls += model.calls
      models.set(model.name, previous)
    }
  }

  return {
    totalTokens,
    freshInputTokens: Math.max(0, current.inputTokens - current.cacheReadTokens),
    cacheShare: current.inputTokens + current.cacheReadTokens > 0
      ? current.cacheReadTokens / (current.inputTokens + current.cacheReadTokens)
      : 0,
    averageTokensPerCall: current.calls > 0 ? totalTokens / current.calls : 0,
    models: [...models.entries()]
      .map(([name, values]) => ({
        name,
        ...values,
        share: totalTokens > 0 ? values.tokens / totalTokens : 0,
      }))
      .sort((a, b) => b.tokens - a.tokens),
    projects: [...current.topProjects].sort((a, b) => b.cost - a.cost),
  }
}
