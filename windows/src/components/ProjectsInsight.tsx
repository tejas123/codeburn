import { useState } from 'react'
import type { ProjectEntry, SessionDetailEntry } from '../lib/payload'
import type { CurrencyState } from '../lib/currency'
import { formatCompactCurrency, formatTokens } from '../lib/currency'

type Props = { activeProjects: ProjectEntry[]; currency: CurrencyState; periodLabel: string; totalCost: number; localOnly?: boolean }

function tokenLabel(entry: Partial<SessionDetailEntry>): string {
  if (entry.inputTokens === undefined && entry.outputTokens === undefined) return 'Tokens unavailable'
  return `${formatTokens((entry.inputTokens ?? 0) + (entry.cacheReadTokens ?? 0) + (entry.cacheWriteTokens ?? 0) + (entry.outputTokens ?? 0))} tokens`
}
function costLabel(entry: { cost: number; unpricedModels?: string[] }, currency: CurrencyState): string {
  if (entry.unpricedModels?.length) return entry.cost > 0 ? `${formatCompactCurrency(entry.cost, currency)} + unpriced` : 'Unpriced usage'
  return formatCompactCurrency(entry.cost, currency)
}
function threadKey(thread: SessionDetailEntry): string {
  return JSON.stringify([thread.provider ?? '', thread.sessionId ?? [thread.date, thread.title ?? '']])
}
function projectName(name: string): string {
  return name.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? name
}

export function ThreadDetail({ task, currency, periodLabel, onBack }: { task: SessionDetailEntry; currency: CurrencyState; periodLabel: string; onBack: () => void }) {
  return <section className="widget-thread-detail">
    <button className="widget-back" onClick={onBack}>← Back to projects</button>
    <h2>{task.title || 'Untitled thread'}</h2>
    <p className="widget-thread-cost">{costLabel(task, currency)}</p>
    <p>{periodLabel} · {tokenLabel(task)}</p>
    <p className="widget-cost-note">Estimated API-equivalent cost · not a bill</p>
    <h3>Model cost breakdown</h3>
    {!task.models?.length && <p>Model breakdown unavailable.</p>}
    {[...(task.models ?? [])].sort((a, b) => b.cost - a.cost).map(model => <div className="widget-model-row" key={model.name}>
      <span>{model.name}</span><strong>{costLabel({ ...model, unpricedModels: task.unpricedModels?.includes(model.name) ? [model.name] : [] }, currency)}</strong>
    </div>)}
    {!!task.unpricedModels?.length && <p>Pricing unavailable: {task.unpricedModels.join(', ')}. The estimate excludes unpriced usage.</p>}
  </section>
}

export function ProjectsInsight({ activeProjects, currency, periodLabel, totalCost, localOnly = false }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ project: string; thread: string } | null>(null)
  const visibleProjects = [...activeProjects].sort((a, b) => b.cost - a.cost)
  const selected = visibleProjects.find(project => (project.id ?? project.name) === selection?.project)
    ?.sessionDetails?.find(thread => threadKey(thread) === selection?.thread)
  if (selected) return <ThreadDetail task={selected} currency={currency} periodLabel={periodLabel} onBack={() => setSelection(null)} />
  return <div className="widget-projects">
    <div className="widget-projects-heading"><strong>Projects</strong><span>{periodLabel}</span></div>
    {visibleProjects.length === 0 && <p className="widget-projects-empty">No projects recorded for this period.</p>}
    {visibleProjects.map((project, index) => {
      const key = project.id ?? project.name
      const isOpen = expanded === key || (expanded === null && index === 0)
      const shareUnavailable = !!project.unpricedModels?.length && project.cost <= 0
      const share = totalCost > 0 ? Math.min(100, Math.max(0, project.cost / totalCost * 100)) : 0
      const threads = [...(project.sessionDetails ?? [])].sort((a, b) => b.cost - a.cost)
      return <div className="widget-project" key={key}>
        <button type="button" className="widget-project-row" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? '' : key)}>
          <span className="widget-project-chevron" aria-hidden="true">{isOpen ? '⌄' : '›'}</span>
          <strong title={project.name}>{projectName(project.name)}</strong>
          <span className="widget-project-cost">{costLabel(project, currency)}</span>
        </button>
        <div className="widget-project-metadata"><span>{tokenLabel(project)} · {project.sessions} {project.sessions === 1 ? 'thread' : 'threads'}</span><span>{shareUnavailable ? 'Share unavailable' : `${Math.round(share)}% of ${periodLabel}${localOnly ? ' on this device' : ''}`}</span></div>
        {!shareUnavailable && <div className="widget-project-bar" aria-hidden="true"><span style={{ width: `${share}%` }} /></div>}
        {isOpen && <div className="widget-task-list">
          {threads.length === 0 && <span className="widget-projects-empty">No threads recorded.</span>}
          {threads.map((task, taskIndex) => <button type="button" className="widget-task" key={`${task.date}:${taskIndex}`} aria-label={`View thread: ${task.title || 'Untitled thread'}`} onClick={() => setSelection({ project: key, thread: threadKey(task) })}>
            <span title={task.title ?? undefined}>{task.title || 'Untitled thread'}</span>
            <small>{tokenLabel(task)}</small><strong>{costLabel(task, currency)}</strong>
          </button>)}
        </div>}
      </div>
    })}
  </div>
}
