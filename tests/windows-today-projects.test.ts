import { describe, expect, it } from 'vitest'
import { createElement } from '../windows/node_modules/react/index.js'
import { renderToStaticMarkup } from '../windows/node_modules/react-dom/server.js'
import { ProjectsInsight } from '../windows/src/components/ProjectsInsight'
import { USD } from '../windows/src/lib/currency'

describe('Windows period-scoped project explorer', () => {
  const activeProjects = [
    { name: 'Small', cost: 1, sessions: 1, sessionDetails: [{ title: 'Small today', cost: 1, calls: 1, inputTokens: 3, outputTokens: 2, date: '2026-09-16' }] },
    { name: 'Big', cost: 9, sessions: 2, sessionDetails: [
      { title: 'Cheap today', cost: 2, calls: 1, inputTokens: 30, outputTokens: 20, date: '2026-09-16' },
      { title: 'Costly today', cost: 7, calls: 1, inputTokens: 300, outputTokens: 200, date: '2026-09-16' },
    ] },
  ]
  const render = () => renderToStaticMarkup(createElement(ProjectsInsight, {
    projects: [{ name: 'Big', cost: 100, sessions: 1, sessionDetails: [{ title: 'Yesterday only', cost: 100, calls: 1, inputTokens: 1, outputTokens: 1, date: '2026-09-15' }] }],
    activeProjects, currency: USD, periodLabel: 'Today', totalCost: 10,
  }))
  it('opens highest-cost project and ranks its today-only threads by cost', () => {
    const html = render()
    expect(html.indexOf('>Big<')).toBeLessThan(html.indexOf('>Small<'))
    expect(html).toContain('Costly today')
    expect(html.indexOf('Costly today')).toBeLessThan(html.indexOf('Cheap today'))
    expect(html).not.toContain('Yesterday only')
  })
  it('shows each project share of the unchanged period total and actionable threads', () => {
    const html = render()
    expect(html).toContain('90% of Today')
    expect(html).toContain('aria-label="View thread: Costly today"')
  })
})

import { HeroSection } from '../windows/src/components/HeroSection'
import { ThreadDetail } from '../windows/src/components/ProjectsInsight'
it('keeps the estimated cost headline even when the tray uses tokens', () => {
  const html = renderToStaticMarkup(createElement(HeroSection, { payload: { current: { cost: 12, sessions: 2, inputTokens: 100, outputTokens: 20, cacheReadTokens: 30, cacheWriteTokens: 10, topProjects: [{ name: 'App' }] } }, currency: USD, periodLabel: 'Today', isToday: true, dailyBudget: null, metric: 'tokens', combinedScope: false }))
  expect(html).toContain('$12.00')
  expect(html).toContain('160 tokens')
  expect(html).toContain('Estimated API-equivalent cost')
  expect(html).toContain('not a bill')
})
it('shows honest model pricing and complete token totals in a thread', () => {
  const html = renderToStaticMarkup(createElement(ThreadDetail, { task: { title: 'Work', cost: 0, calls: 1, inputTokens: 10, outputTokens: 20, cacheReadTokens: 30, cacheWriteTokens: 40, unpricedModels: ['new-model'], models: [{ name: 'new-model', cost: 0 }], date: '2026-09-16' }, currency: USD, periodLabel: 'Today', onBack: () => {} }))
  expect(html).toContain('100 tokens')
  expect(html).toContain('Unpriced usage')
  expect(html).not.toContain('$0.00')
  expect(html).toContain('Back to projects')
})
it('names unpriced models from the CLI headline payload without reporting zero cost', () => {
  const html = renderToStaticMarkup(createElement(HeroSection, { payload: { current: { cost: 0, sessions: 1, inputTokens: 10, outputTokens: 5, unpricedModels: [{ model: 'new-model', calls: 1, tokens: 15 }] } }, currency: USD, periodLabel: 'Today', isToday: true, dailyBudget: null, metric: 'cost', combinedScope: false }))
  expect(html).toContain('Unpriced usage')
  expect(html).toContain('Excludes unpriced usage: new-model')
  expect(html).not.toContain('$0.00')
})
it('does not invent a zero-percent share for entirely unpriced project usage', () => {
  const html = renderToStaticMarkup(createElement(ProjectsInsight, { activeProjects: [{ name: 'Unknown', cost: 0, sessions: 1, unpricedModels: ['new-model'] }], totalCost: 0, currency: USD, periodLabel: 'Today' }))
  expect(html).toContain('Share unavailable')
  expect(html).not.toContain('0% of Today')
})
it('uses combined total tokens and labels project counts as local', () => {
  const html = renderToStaticMarkup(createElement(HeroSection, { payload: { generated: '2026-09-16T10:00:00Z', current: { cost: 2, sessions: 1, inputTokens: 100, outputTokens: 20, topProjects: [{ name: 'App' }] }, combined: { perDevice: [], combined: { cost: 12, sessions: 2, inputTokens: 200, outputTokens: 40, cacheReadTokens: 600, totalTokens: 920, reachableCount: 2, deviceCount: 2 } } }, currency: USD, periodLabel: 'Today', isToday: true, dailyBudget: null, metric: 'cost', combinedScope: true }))
  expect(html).toContain('920 tokens')
  expect(html).toContain('1 local projects')
  expect(html).toContain('Projects and threads show this device only')
  expect(html).toContain('Updated')
  expect(html).toContain('dateTime="2026-09-16T10:00:00Z"')
})
it('explicitly labels local project shares when viewing combined usage', () => {
  const html = renderToStaticMarkup(createElement(ProjectsInsight, { activeProjects: [{ name: 'App', cost: 5, sessions: 1 }], totalCost: 10, currency: USD, periodLabel: 'Today', localOnly: true }))
  expect(html).toContain('50% of Today on this device')
})
it('includes combined cache creation when older payloads omit totalTokens', () => {
  const html = renderToStaticMarkup(createElement(HeroSection, { payload: { current: { cost: 1, inputTokens: 1, outputTokens: 1, sessions: 1 }, combined: { perDevice: [], combined: { cost: 5, inputTokens: 100, outputTokens: 20, cacheReadTokens: 300, cacheCreateTokens: 40, sessions: 2, reachableCount: 2, deviceCount: 2 } } }, currency: USD, periodLabel: 'Today', isToday: true, dailyBudget: null, metric: 'cost', combinedScope: true }))
  expect(html).toContain('460 tokens')
})
