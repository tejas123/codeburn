import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PeriodProjects } from '../src/components/PeriodProjects'

describe('period-scoped web project tree', () => {
  it('opens the highest-cost project with its highest-cost thread first', () => {
    const html = renderToStaticMarkup(<PeriodProjects label="Today" cost={20} tokens={600} projects={[
      { name: 'Smaller project', cost: 2, sessionDetails: [] },
      { name: 'Largest project', cost: 18, sessionDetails: [
        { title: 'Cheaper thread', cost: 3, inputTokens: 100, outputTokens: 50, models: [] },
        { title: 'Largest thread', cost: 15, inputTokens: 300, outputTokens: 150, models: [] },
      ] },
    ]} />)
    expect(html.indexOf('Largest project')).toBeLessThan(html.indexOf('Smaller project'))
    expect(html.indexOf('Largest thread')).toBeLessThan(html.indexOf('Cheaper thread'))
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('Since local midnight')
    expect(html).toContain('width:90%')
  })

  it('shows unavailable data honestly for peers without thread details', () => {
    const html = renderToStaticMarkup(<PeriodProjects label="Today" cost={Number.NaN} tokens={Number.NaN} projects={[{ name: 'Peer', cost: 5 }]} />)
    expect(html).toContain('Unavailable')
    expect(html).toContain('Thread detail unavailable')
    expect(html).not.toContain('$0.00')
  })
})

it('leaves unpriced shares unavailable and identifies the priced denominator', () => {
  const html = renderToStaticMarkup(<PeriodProjects label="Today" cost={20} tokens={500} unpriced projects={[{ name: 'Project', cost: 0, unpricedModels: ['unknown'], sessionDetails: [{ title: 'Thread', cost: 0, unpricedModels: ['unknown'], models: [] }] }]} />)
  expect(html).not.toContain('>0%')
  expect(html.match(/title="Cost share unavailable"/g)).toHaveLength(2)
  expect(html).toContain('priced cost')
  expect(html).toContain('Shares use the priced period cost')
})

it('uses local-midnight wording for the actual dated Today payload label', () => {
  const html = renderToStaticMarkup(<PeriodProjects label="Today (2026-09-16)" cost={20} tokens={500} projects={[]} />)
  expect(html).toContain('Since local midnight')
  expect(html).toContain('Share of today cost')
  expect(html).not.toContain('Share of today (2026-09-16)')
})
