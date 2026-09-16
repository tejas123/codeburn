// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { PeriodProjects } from './PeriodProjects'

it('ranks scoped projects and threads by cost, keeps the headline stable, and returns from detail', () => {
  const thread = (title: string, cost: number) => ({ title, cost, inputTokens: 100, outputTokens: 20, date: '2026-09-16', models: [{ name: 'test-model', cost }] })
  render(<PeriodProjects label="Today" cost={20} tokens={360} projects={[
    { name: 'Small', cost: 2, sessionDetails: [thread('Small thread', 2)] },
    { name: 'Large', cost: 18, sessionDetails: [thread('Cheaper thread', 3), thread('Largest thread', 15)] },
  ]} />)
  expect(screen.getAllByRole('button')[0]).toHaveTextContent('Large')
  expect(screen.getByRole('button', { name: /Large.*90%/ })).toHaveAttribute('aria-expanded', 'true')
  const buttons = screen.getAllByRole('button')
  expect(buttons[1]).toHaveTextContent('Largest thread')
  fireEvent.click(screen.getByRole('button', { name: /Largest thread/ }))
  expect(within(screen.getByLabelText('Period totals')).getByText('$20.00')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Largest thread' })).toBeInTheDocument()
  expect(screen.getByText('test-model')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Back to projects/ }))
  expect(screen.getByRole('button', { name: /Largest thread/ })).toBeInTheDocument()
})

it('keeps missing token and thread details unknown', () => {
  render(<PeriodProjects label="Today" cost={4} tokens={200} projects={[{ name: 'Older peer', cost: 4 }]} />)
  expect(screen.getByText(/Token detail unavailable/)).toBeInTheDocument()
  expect(screen.getByText(/Thread detail unavailable/)).toBeInTheDocument()
})

it('marks unknown headline values and unpriced model cost instead of zero', () => {
  render(<PeriodProjects label="Today" cost={Number.NaN} tokens={Number.NaN} projects={[]} />)
  expect(within(screen.getByLabelText('Period totals')).getAllByText('Unavailable')).toHaveLength(2)
})

it('refreshes an open thread from the current payload', () => {
  const projects = (cost: number) => [{ id: 'p', name: 'Project', cost, sessionDetails: [{ sessionId: 's', title: 'Thread', cost, models: [] }] }]
  const { rerender } = render(<PeriodProjects label="Today" cost={5} tokens={100} projects={projects(5)} />)
  fireEvent.click(screen.getByRole('button', { name: /^Thread/ }))
  rerender(<PeriodProjects label="Today" cost={9} tokens={200} projects={projects(9)} />)
  expect(screen.getByText('$9.00 estimated')).toBeInTheDocument()
})

it('uses project token totals even when thread detail is unavailable', () => {
  render(<PeriodProjects label="Today" cost={4} tokens={900} projects={[{ name: 'Project', cost: 4, inputTokens: 800, outputTokens: 100 }]} />)
  expect(screen.getByRole('button', { name: /Project/ })).toHaveTextContent('900 tokens')
})

it('counts cache read and cache write tokens in project and thread totals', () => {
  render(<PeriodProjects label="Today" cost={4} tokens={500} projects={[{ name: 'Project', cost: 4, sessionDetails: [{ title: 'Cached thread', cost: 4, inputTokens: 100, cacheReadTokens: 200, cacheWriteTokens: 50, outputTokens: 150, models: [] }] }]} />)
  expect(screen.getByRole('button', { name: /^Cached thread/ })).toHaveTextContent('500 tokens')
  expect(screen.getByRole('button', { name: /Project/ })).toHaveTextContent('500 tokens')
})

it('labels unpriced project and thread usage instead of reporting zero cost', () => {
  render(<PeriodProjects label="Today" cost={0} tokens={500} unpriced projects={[{ name: 'Project', cost: 0, unpricedModels: ['new-model'], sessionDetails: [{ title: 'Unpriced thread', cost: 0, unpricedModels: ['new-model'], models: [{ name: 'new-model', cost: 0 }] }] }]} />)
  expect(screen.getByRole('button', { name: /Project/ })).toHaveTextContent('Unpriced usage')
  expect(screen.getByRole('button', { name: /^Unpriced thread/ })).toHaveTextContent('Unpriced usage')
})

it('does not assign a zero cost share to unpriced usage in a partly priced day', () => {
  render(<PeriodProjects label="Today" cost={20} tokens={500} unpriced projects={[{ name: 'Unknown project', cost: 0, unpricedModels: ['new-model'], sessionDetails: [{ title: 'Unknown thread', cost: 0, unpricedModels: ['new-model'], models: [] }] }]} />)
  for (const button of screen.getAllByRole('button')) {
    expect(button).not.toHaveTextContent('0%')
    expect(within(button).getByTitle('Cost share unavailable')).toBeInTheDocument()
  }
  expect(screen.getByText(/Share of today priced cost/)).toBeInTheDocument()
})

it('keeps combined denominator and local row counts visible while inspecting a thread', () => {
  render(<PeriodProjects label="Combined · Today" cost={20} tokens={500} unpriced combined projects={[{ name: 'Project', cost: 5, sessionDetails: [{ title: 'Thread', cost: 5, models: [] }] }]} />)
  fireEvent.click(screen.getByRole('button', { name: /^Thread/ }))
  expect(screen.getByText(/1 local project · 1 listed local thread/)).toHaveTextContent('Shares use the combined priced period cost')
})

it('recognizes the dated Today label emitted by the backend', () => {
  render(<PeriodProjects label="Today (2026-09-16)" cost={20} tokens={500} projects={[]} />)
  expect(screen.getByText(/Since local midnight/)).toBeInTheDocument()
  expect(screen.getByText(/Share of today cost/)).toBeInTheDocument()
  expect(screen.queryByText(/Share of today \(2026-09-16\)/)).not.toBeInTheDocument()
})
