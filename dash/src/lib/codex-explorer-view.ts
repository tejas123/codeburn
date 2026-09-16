import type { CodexExplorerModel, CodexExplorerSession } from '@/lib/api'

export type ExplorerSort = 'tokens' | 'cost' | 'recent' | 'title'
export type ExplorerFilters = { project: string; chat: string; model: string; sort: ExplorerSort }

export type ExplorerProject = {
  name: string
  count: number
  tokens: number
  cost: number
  sessions: CodexExplorerSession[]
}

export function reconcileEffortModels(summary: CodexExplorerModel[], raw: CodexExplorerModel[]): CodexExplorerModel[] {
  const rawByModel = new Map<string, CodexExplorerModel[]>()
  for (const row of raw) rawByModel.set(row.name, [...(rawByModel.get(row.name) ?? []), row])

  return summary.flatMap((model) => {
    const effortRows = rawByModel.get(model.name)
    if (!effortRows?.length) return model
    if (effortRows.length === 1) return { ...model, effort: effortRows[0].effort }

    const rawTotal = effortRows.reduce((sum, row) => sum + row.totalTokens, 0)
    if (!rawTotal) return model
    return effortRows.map((row) => {
      const ratio = row.totalTokens / rawTotal
      return {
        ...model,
        effort: row.effort,
        totalTokens: model.totalTokens * ratio,
        inputTokens: model.inputTokens * ratio,
        cachedInputTokens: model.cachedInputTokens * ratio,
        outputTokens: model.outputTokens * ratio,
        reasoningTokens: model.reasoningTokens * ratio,
        cost: model.cost * ratio,
      }
    })
  })
}

function selectedModel(session: CodexExplorerSession, model: string) {
  return model ? session.models.find((row) => row.name === model) : undefined
}

export function explorerSessionTokens(session: CodexExplorerSession, model: string): number {
  return selectedModel(session, model)?.totalTokens ?? (model ? 0 : session.totalTokens)
}

export function explorerSessionCost(session: CodexExplorerSession, model: string): number {
  return selectedModel(session, model)?.cost ?? (model ? 0 : session.cost)
}

export function buildCodexExplorerView(sessions: CodexExplorerSession[], filters: ExplorerFilters) {
  const filtered = sessions.filter((session) => (
    (!filters.project || session.project === filters.project)
    && (!filters.chat || session.id === filters.chat)
    && (!filters.model || session.models.some((model) => model.name === filters.model))
  ))
  const sorted = [...filtered].sort((a, b) => {
    if (filters.sort === 'title') return a.title.localeCompare(b.title)
    if (filters.sort === 'recent') return b.updated.localeCompare(a.updated)
    if (filters.sort === 'cost') return explorerSessionCost(b, filters.model) - explorerSessionCost(a, filters.model)
    return explorerSessionTokens(b, filters.model) - explorerSessionTokens(a, filters.model)
  })
  const groups = new Map<string, CodexExplorerSession[]>()
  for (const session of sorted) {
    const key = session.project || 'No project'
    groups.set(key, [...(groups.get(key) ?? []), session])
  }
  const projects = [...groups.entries()].map(([name, rows]) => ({
    name,
    count: rows.length,
    tokens: rows.reduce((sum, row) => sum + explorerSessionTokens(row, filters.model), 0),
    cost: rows.reduce((sum, row) => sum + explorerSessionCost(row, filters.model), 0),
    sessions: rows,
  }))
  return { sessions: sorted, projects }
}
