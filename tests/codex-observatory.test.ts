import { describe, expect, it } from 'vitest'

import { buildCodexObservatory, selectDailyForPeriod } from '../dash/src/lib/codex-observatory.js'
import { groupCodexThreads } from '../dash/src/lib/codex-threads.js'

describe('Codex Observatory view model', () => {
  it('derives token-first totals and model shares from the Codex payload', () => {
    const result = buildCodexObservatory({
      current: {
        inputTokens: 800,
        outputTokens: 200,
        cacheReadTokens: 600,
        sessions: 4,
        calls: 10,
        cost: 1.25,
        topProjects: [{ name: 'Alpha', cost: 0.75, sessions: 3 }],
      },
      daily: [
        {
          date: '2026-09-15',
          inputTokens: 500,
          outputTokens: 100,
          topModels: [{ name: 'gpt-5', inputTokens: 500, outputTokens: 100, calls: 6, cost: 0.8 }],
        },
        {
          date: '2026-09-16',
          inputTokens: 300,
          outputTokens: 100,
          topModels: [{ name: 'gpt-5-mini', inputTokens: 300, outputTokens: 100, calls: 4, cost: 0.45 }],
        },
      ],
    })

    expect(result.totalTokens).toBe(1000)
    expect(result.cacheShare).toBeCloseTo(600 / 1400)
    expect(result.averageTokensPerCall).toBe(100)
    expect(result.models).toEqual([
      { name: 'gpt-5', tokens: 600, calls: 6, share: 0.6 },
      { name: 'gpt-5-mini', tokens: 400, calls: 4, share: 0.4 },
    ])
    expect(result.projects[0]).toMatchObject({ name: 'Alpha', sessions: 3 })
  })

  it('keeps model totals within the selected dashboard period', () => {
    const daily = [
      { date: '2026-09-16', inputTokens: 80, outputTokens: 20, topModels: [] },
      { date: '2026-09-15', inputTokens: 50, outputTokens: 10, topModels: [] },
      { date: '2026-08-01', inputTokens: 500, outputTokens: 100, topModels: [] },
    ]

    expect(selectDailyForPeriod(daily, 'today', '2026-09-16')).toHaveLength(1)
    expect(selectDailyForPeriod(daily, 'week', '2026-09-16')).toHaveLength(2)
    expect(selectDailyForPeriod(daily, 'month', '2026-09-16')).toHaveLength(2)
    expect(selectDailyForPeriod(daily, 'lifetime', '2026-09-16')).toHaveLength(3)
  })

  it('returns finite zero-state metrics for an empty payload', () => {
    const result = buildCodexObservatory({
      current: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        sessions: 0,
        calls: 0,
        cost: 0,
        topProjects: [],
      },
      daily: [],
    })

    expect(result.cacheShare).toBe(0)
    expect(result.averageTokensPerCall).toBe(0)
    expect(result.models).toEqual([])
  })
})

describe('Codex project and thread explorer', () => {
  it('groups threads by project while keeping the newest thread first', () => {
    const groups = groupCodexThreads([
      { sessionId: 'older', project: 'Alpha', title: 'Older', mtimeMs: 10 },
      { sessionId: 'beta', project: 'Beta', title: 'Beta task', mtimeMs: 30 },
      { sessionId: 'newer', project: 'Alpha', title: 'Newer', mtimeMs: 20 },
      { sessionId: 'loose', project: '', title: 'Loose task', mtimeMs: 5 },
    ])

    expect(groups.map((group) => group.name)).toEqual(['Beta', 'Alpha', 'No project'])
    expect(groups[1]?.threads.map((thread) => thread.sessionId)).toEqual(['newer', 'older'])
  })

  it('matches project names, thread titles, and ids', () => {
    const rows = [
      { sessionId: 'abc-123', project: 'Codex Usage', title: 'Dashboard explorer', mtimeMs: 20 },
      { sessionId: 'def-456', project: 'Other', title: 'Unrelated', mtimeMs: 10 },
    ]

    expect(groupCodexThreads(rows, 'dashboard')[0]?.threads).toHaveLength(1)
    expect(groupCodexThreads(rows, 'codex usage')[0]?.name).toBe('Codex Usage')
    expect(groupCodexThreads(rows, 'abc-123')[0]?.threads[0]?.title).toBe('Dashboard explorer')
  })
})
