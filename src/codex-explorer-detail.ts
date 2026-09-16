import { calculateCost, getShortModelName } from './models.js'
import { readSessionLines } from './fs-utils.js'
import type { CodexExplorerModel } from './codex-explorer.js'
import type { DateRange } from './types.js'

type Usage = { input: number; cached: number; output: number; reasoning: number; total: number }

function safe(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function counters(value: unknown): Usage {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    input: safe(row['input_tokens']),
    cached: safe(row['cached_input_tokens']),
    output: safe(row['output_tokens']),
    reasoning: safe(row['reasoning_output_tokens']),
    total: safe(row['total_tokens']),
  }
}

export function parseCodexEffortBreakdown(lines: Iterable<string>, range: DateRange): CodexExplorerModel[] {
  let model = 'unknown'
  let effort = 'unknown'
  let previous = counters(null)
  const rows = new Map<string, CodexExplorerModel>()

  for (const line of lines) {
    let entry: { type?: string; timestamp?: string; payload?: Record<string, unknown> }
    try { entry = JSON.parse(line) as typeof entry } catch { continue }
    const payload = entry.payload ?? {}
    if (entry.type === 'turn_context') {
      if (typeof payload['model'] === 'string' && payload['model']) model = payload['model']
      const rawEffort = payload['effort'] ?? payload['reasoning_effort']
      effort = typeof rawEffort === 'string' && rawEffort ? rawEffort : 'unknown'
      continue
    }
    if (entry.type !== 'event_msg' || payload['type'] !== 'token_count') continue
    const info = payload['info']
    const totalUsage = info && typeof info === 'object' ? (info as Record<string, unknown>)['total_token_usage'] : null
    if (!totalUsage) continue
    const current = counters(totalUsage)
    if (current.total < previous.total) previous = counters(null)
    const delta = {
      input: Math.max(0, current.input - previous.input),
      cached: Math.max(0, current.cached - previous.cached),
      output: Math.max(0, current.output - previous.output),
      reasoning: Math.max(0, current.reasoning - previous.reasoning),
      total: Math.max(0, current.total - previous.total),
    }
    previous = current
    const at = entry.timestamp ? new Date(entry.timestamp) : null
    if (!at || !Number.isFinite(at.getTime()) || at < range.start || at >= range.end || delta.total === 0) continue

    const name = getShortModelName(model)
    const key = `${name}\u0000${effort}`
    const row = rows.get(key) ?? { name, effort, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0, cost: 0 }
    row.inputTokens += delta.input
    row.cachedInputTokens += delta.cached
    row.outputTokens += delta.output
    row.reasoningTokens += delta.reasoning
    row.totalTokens += delta.total
    row.cost += calculateCost(model, Math.max(0, delta.input - delta.cached), delta.output, 0, delta.cached, 0)
    rows.set(key, row)
  }
  return [...rows.values()].sort((a, b) => b.totalTokens - a.totalTokens)
}

export async function readCodexEffortBreakdown(filePath: string, range: DateRange): Promise<CodexExplorerModel[]> {
  const lines: string[] = []
  for await (const line of readSessionLines(filePath)) lines.push(line)
  return parseCodexEffortBreakdown(lines, range)
}
