import { useState } from 'react'
import { formatCompact, formatUsd } from '../lib/format'
import './PeriodProjects.css'

export type PeriodThread = {
  sessionId?: string
  title?: string
  provider?: string
  cost: number
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  unpricedModels?: string[]
  models: Array<{ name: string; cost: number }>
}
export type PeriodProject = {
  id?: string
  name: string
  cost: number
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  unpricedModels?: string[]
  sessionDetails?: PeriodThread[]
}

type Props = {
  label: string
  cost: number
  tokens: number
  projects: PeriodProject[]
  unpriced?: boolean
  combined?: boolean
}

function tokenCount(thread: PeriodThread): number | undefined {
  return thread.inputTokens == null || thread.outputTokens == null ? undefined : thread.inputTokens + (thread.cacheReadTokens ?? 0) + (thread.cacheWriteTokens ?? 0) + thread.outputTokens
}

function threadName(thread: PeriodThread, index: number): string {
  return thread.title || (thread.sessionId ? `Thread ${thread.sessionId.slice(0, 8)}` : `Thread ${index + 1}`)
}

function costLabel(cost: number, unpriced = false): string {
  if (!Number.isFinite(cost)) return 'Unavailable'
  if (unpriced) return cost > 0 ? `${formatUsd(cost)} + unpriced` : 'Unpriced usage'
  return formatUsd(cost)
}

function ShareBar({ cost, total, unpriced }: { cost: number; total: number; unpriced?: boolean }) {
  if ((cost === 0 && unpriced) || !Number.isFinite(cost) || !Number.isFinite(total) || total <= 0) return <span className="period-share" title="Cost share unavailable">—</span>
  const share = cost / total * 100
  return <span className="period-share"><span className="period-bar"><span style={{ width: `${Math.min(100, share)}%` }} /></span><span>{Math.round(share)}%</span></span>
}

/** Only accepts the period-scoped project rows. History never contributes to this view. */
export function PeriodProjects({ label, cost, tokens, projects, unpriced, combined = false }: Props) {
  const isToday = /^(?:Combined · )?Today(?: \(\d{4}-\d{2}-\d{2}\))?$/.test(label)
  const sharePeriod = isToday ? 'today' : label.toLowerCase()
  const ranked = [...projects].sort((a, b) => b.cost - a.cost)
  const listedThreads = projects.reduce((count, project) => count + (project.sessionDetails?.length ?? 0), 0)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedKey, setSelection] = useState<{ project: string; thread: string } | null>(null)
  const selectedProject = ranked.find((project, index) => (project.id ?? `${project.name}:${index}`) === selectedKey?.project)
  const selectedThread = [...(selectedProject?.sessionDetails ?? [])].sort((a, b) => b.cost - a.cost)
    .map((thread, index) => ({ thread, title: threadName(thread, index), key: `${thread.provider}:${thread.sessionId ?? index}` }))
    .find(row => row.key === selectedKey?.thread)
  const selection = selectedProject && selectedThread ? { project: selectedProject.name, ...selectedThread } : null
  return <section className="period-projects" aria-label={`${label} usage`}>
    <div className="period-headline" aria-label="Period totals">
      <h2>{label}</h2>
      <div className="period-totals"><div><span>Estimated cost</span><strong>{costLabel(cost, unpriced)}</strong></div><div><span>Tokens</span><strong>{Number.isFinite(tokens) ? formatCompact(tokens) : 'Unavailable'}</strong></div></div>
      <p>{ranked.length} {combined ? 'local ' : ''}{ranked.length === 1 ? 'project' : 'projects'} · {listedThreads} listed {combined ? 'local ' : ''}{listedThreads === 1 ? 'thread' : 'threads'}. Shares use the {combined ? 'combined ' : ''}{unpriced ? 'priced ' : ''}period cost.</p>
      <p>API-equivalent estimate · {isToday ? 'Since local midnight' : 'Selected period'}{unpriced ? ' · Partial estimate: some models have no price' : ''}</p>
    </div>
    {selection ? <div className="period-detail">
      <button className="period-back" onClick={() => setSelection(null)}>← Back to projects</button>
      <p>{selection.project} · {label}</p><h3>{selection.title}</h3>
      <div className="period-detail-totals"><strong>{costLabel(selection.thread.cost, !!selection.thread.unpricedModels?.length)} estimated</strong><span>{tokenCount(selection.thread) == null ? 'Tokens unavailable' : `${formatCompact(tokenCount(selection.thread)!)} tokens`}</span></div>
      {!!selection.thread.unpricedModels?.length && <p>Partial estimate · Unpriced: {selection.thread.unpricedModels.join(', ')}</p>}
      <dl className="period-token-breakdown">{[
        ['Input', selection.thread.inputTokens], ['Cached input', selection.thread.cacheReadTokens],
        ['Cache write', selection.thread.cacheWriteTokens], ['Output', selection.thread.outputTokens],
      ].map(([name, value]) => <div key={name as string}><dt>{name}</dt><dd>{value == null ? 'Unavailable' : formatCompact(value as number)}</dd></div>)}</dl>
      <h4>Model breakdown · {label}</h4>
      {selection.thread.models.length ? <ul className="period-models">{[...selection.thread.models].sort((a, b) => b.cost - a.cost).map(model => <li key={model.name}><span>{model.name}</span><strong>{selection.thread.unpricedModels?.includes(model.name) ? 'Unpriced' : formatUsd(model.cost)}</strong></li>)}</ul> : <p>Model detail unavailable.</p>}
      <p>Total tokens include input, cached input, cache write and output.</p>
    </div> : <div className="period-tree">
      <div className="period-tree-heading"><h3>Projects</h3><span>{ranked.length} projects · Share of {sharePeriod} {unpriced ? 'priced cost' : 'cost'}</span></div>
      {!ranked.length && <p>No recorded usage in this period.</p>}
      {ranked.map((project, index) => {
        const key = project.id ?? `${project.name}:${index}`
        const open = expanded[key] ?? index === 0
        const threads = [...(project.sessionDetails ?? [])].sort((a, b) => b.cost - a.cost)
        const counts = threads.map(tokenCount)
        const projectTokens = project.inputTokens != null && project.outputTokens != null
          ? project.inputTokens + (project.cacheReadTokens ?? 0) + (project.cacheWriteTokens ?? 0) + project.outputTokens
          : threads.length && counts.every(value => value != null) ? counts.reduce<number>((sum, value) => sum + value!, 0) : undefined
        return <div className="period-project" key={key}>
          <button className="period-project-row" aria-expanded={open} onClick={() => setExpanded(current => ({ ...current, [key]: !open }))}>
            <span className="period-name"><strong>{open ? '▾' : '▸'} {project.name}</strong><small>{project.sessionDetails ? `${threads.length} ${threads.length === 1 ? 'thread' : 'threads'} · ` : ''}{projectTokens == null ? 'Token detail unavailable' : `${formatCompact(projectTokens)} tokens`}</small></span>
            <span className="period-cost">{costLabel(project.cost, !!project.unpricedModels?.length)}<ShareBar cost={project.cost} total={cost} unpriced={!!project.unpricedModels?.length} /></span>
          </button>
          {open && <div className="period-threads">{threads.length ? threads.map((thread, threadIndex) => <button className="period-thread" key={`${thread.provider}:${thread.sessionId ?? threadIndex}`} onClick={() => setSelection({ project: key, thread: `${thread.provider}:${thread.sessionId ?? threadIndex}` })}>
            <span className="period-name"><strong>{threadName(thread, threadIndex)}</strong><small>{tokenCount(thread) == null ? 'Tokens unavailable' : `${formatCompact(tokenCount(thread)!)} tokens`}</small></span>
            <span className="period-cost">{costLabel(thread.cost, !!thread.unpricedModels?.length)}<ShareBar cost={thread.cost} total={cost} unpriced={!!thread.unpricedModels?.length} /></span>
          </button>) : <p>Thread detail unavailable for this project.</p>}</div>}
        </div>
      })}
    </div>}
  </section>
}
