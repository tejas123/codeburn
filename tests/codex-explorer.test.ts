import { describe, expect, it } from 'vitest'

import { buildCodexExplorerPayload } from '../src/codex-explorer.js'
import { parseCodexEffortBreakdown } from '../src/codex-explorer-detail.js'
import { buildCodexExplorerView, reconcileEffortModels } from '../dash/src/lib/codex-explorer-view.js'

const call = (model: string, input: number, cached: number, output: number, reasoning: number, costUSD: number) => ({
  provider: 'codex', model, costUSD,
  usage: {
    inputTokens: input,
    outputTokens: output,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: cached,
    cachedInputTokens: 0,
    reasoningTokens: reasoning,
    webSearchRequests: 0,
  },
})

describe('Codex usage explorer payload', () => {
  it('keeps exact token categories, cost, model totals, and saved titles', () => {
    const payload = buildCodexExplorerPayload([
      {
        project: 'Alpha',
        projectPath: '/work/Alpha',
        sessions: [{
          sessionId: 'session-one',
          project: 'Alpha',
          title: 'Fallback title',
          firstTimestamp: '2026-09-15T10:00:00Z',
          lastTimestamp: '2026-09-16T10:00:00Z',
          totalCostUSD: 3,
          totalInputTokens: 100,
          totalCacheReadTokens: 900,
          totalOutputTokens: 80,
          totalReasoningTokens: 20,
          turns: [{ assistantCalls: [call('gpt-5', 100, 900, 80, 20, 3)] }],
        }],
      },
    ] as never, new Map([['session-one', 'Saved Codex title']]), 'Mac')

    expect(payload.sessions[0]).toMatchObject({
      id: 'session-one', title: 'Saved Codex title', project: 'Alpha', machine: 'Mac',
      inputTokens: 1000, cachedInputTokens: 900, outputTokens: 80,
      reasoningTokens: 20, totalTokens: 1080, cost: 3,
    })
    expect(payload.sessions[0]?.models[0]).toMatchObject({
      name: 'GPT-5', inputTokens: 1000, cachedInputTokens: 900,
      outputTokens: 80, reasoningTokens: 20, totalTokens: 1080, cost: 3,
    })
  })

  it('splits cumulative Codex counters by model and effort', () => {
    const lines = [
      { type: 'turn_context', payload: { model: 'gpt-5', effort: 'high' } },
      { timestamp: '2026-09-16T10:00:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 100, reasoning_output_tokens: 40, total_tokens: 1100 } } } },
      { type: 'turn_context', payload: { model: 'gpt-5', effort: 'xhigh' } },
      { timestamp: '2026-09-16T11:00:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 1600, cached_input_tokens: 1300, output_tokens: 180, reasoning_output_tokens: 70, total_tokens: 1780 } } } },
    ].map(JSON.stringify)

    const rows = parseCodexEffortBreakdown(lines, { start: new Date('2026-09-16T00:00:00Z'), end: new Date('2026-09-17T00:00:00Z') })

    expect(rows.map((row) => ({ effort: row.effort, tokens: row.totalTokens, cached: row.cachedInputTokens, reasoning: row.reasoningTokens }))).toEqual([
      { effort: 'high', tokens: 1100, cached: 800, reasoning: 40 },
      { effort: 'xhigh', tokens: 680, cached: 500, reasoning: 30 },
    ])
  })
})

describe('Codex usage explorer controls', () => {
  const sessions = [
    { id: 'a', title: 'Large', project: 'Alpha', updated: '2026-09-16T00:00:00Z', totalTokens: 100, cost: 2, models: [{ name: 'GPT-5' }] },
    { id: 'b', title: 'Small', project: 'Alpha', updated: '2026-09-15T00:00:00Z', totalTokens: 20, cost: 4, models: [{ name: 'GPT-6' }] },
    { id: 'c', title: 'Beta', project: 'Beta', updated: '2026-09-14T00:00:00Z', totalTokens: 50, cost: 1, models: [{ name: 'GPT-5' }] },
  ]

  it('filters by project, chat, and model', () => {
    expect(buildCodexExplorerView(sessions as never, { project: 'Alpha', chat: '', model: 'GPT-5', sort: 'tokens' }).sessions.map((s) => s.id)).toEqual(['a'])
    expect(buildCodexExplorerView(sessions as never, { project: '', chat: 'b', model: '', sort: 'tokens' }).sessions.map((s) => s.id)).toEqual(['b'])
  })

  it('sorts chats and calculates project totals from the filtered rows', () => {
    const view = buildCodexExplorerView(sessions as never, { project: 'Alpha', chat: '', model: '', sort: 'cost' })
    expect(view.sessions.map((s) => s.id)).toEqual(['b', 'a'])
    expect(view.projects[0]).toMatchObject({ name: 'Alpha', tokens: 120, cost: 6, count: 2 })
  })

  it('adds effort labels without replacing the authoritative usage totals', () => {
    const summary = [{
      name: 'GPT-5', effort: 'unknown', totalTokens: 1000, inputTokens: 900,
      cachedInputTokens: 700, outputTokens: 100, reasoningTokens: 40, cost: 3,
    }]
    const raw = [{
      name: 'GPT-5', effort: 'high', totalTokens: 600, inputTokens: 550,
      cachedInputTokens: 400, outputTokens: 50, reasoningTokens: 20, cost: 2,
    }]

    expect(reconcileEffortModels(summary, raw)).toEqual([{ ...summary[0], effort: 'high' }])
  })
})
