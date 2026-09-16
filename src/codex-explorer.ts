import { hostname } from 'node:os'
import { basename } from 'node:path'

import { getShortModelName } from './models.js'
import type { ProjectSummary } from './types.js'

export type CodexExplorerModel = {
  name: string
  effort: string
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningTokens: number
  totalTokens: number
  cost: number
}

export type CodexExplorerSession = {
  id: string
  title: string
  project: string
  machine: string
  updated: string
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningTokens: number
  totalTokens: number
  cost: number
  models: CodexExplorerModel[]
}

export type CodexExplorerPayload = { sessions: CodexExplorerSession[] }

type ModelAccumulator = Omit<CodexExplorerModel, 'name' | 'effort' | 'totalTokens'>

function projectName(project: ProjectSummary, workingDirectory: string | undefined): string {
  const normalized = workingDirectory?.replace(/\\/g, '/').replace(/\/$/, '') ?? ''
  if (/\/Documents\/Codex\/\d{4}-\d{2}-\d{2}\/[^/]+$/i.test(normalized)) return ''
  return normalized ? basename(normalized) : project.project
}

export function buildCodexExplorerPayload(
  projects: ProjectSummary[],
  titles = new Map<string, string>(),
  machine = hostname(),
): CodexExplorerPayload {
  const sessions = projects.flatMap((project) => project.sessions.map((session) => {
    const byModel = new Map<string, ModelAccumulator>()
    for (const call of session.turns.flatMap((turn) => turn.assistantCalls)) {
      const name = getShortModelName(call.model)
      const row = byModel.get(name) ?? {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cost: 0,
      }
      row.inputTokens += call.usage.inputTokens + call.usage.cacheReadInputTokens
      row.cachedInputTokens += call.usage.cacheReadInputTokens
      row.outputTokens += call.usage.outputTokens
      row.reasoningTokens += call.usage.reasoningTokens
      row.cost += call.costUSD
      byModel.set(name, row)
    }
    const models = [...byModel.entries()]
      .map(([name, row]) => ({ name, effort: 'unknown', ...row, totalTokens: row.inputTokens + row.outputTokens }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
    const inputTokens = session.totalInputTokens + session.totalCacheReadTokens
    const outputTokens = session.totalOutputTokens

    return {
      id: session.sessionId,
      title: titles.get(session.sessionId) ?? session.title ?? session.sessionId,
      project: projectName(project, session.workingDirectory ?? project.projectPath),
      machine,
      updated: session.lastTimestamp,
      inputTokens,
      cachedInputTokens: session.totalCacheReadTokens,
      outputTokens,
      reasoningTokens: session.totalReasoningTokens,
      totalTokens: inputTokens + outputTokens,
      cost: session.totalCostUSD,
      models,
    }
  }))

  return { sessions: sessions.sort((a, b) => b.updated.localeCompare(a.updated)) }
}
