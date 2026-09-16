import { useState } from 'react'

import type { ProjectEntry } from '../lib/payload'
import type { CurrencyState } from '../lib/currency'
import { formatCompactCurrency, formatTokens } from '../lib/currency'

type Props = { projects: ProjectEntry[]; activeProjects: ProjectEntry[]; currency: CurrencyState; periodLabel: string }

function tokenLabel(input?: number, cached?: number, output?: number): string {
  if (input === undefined && cached === undefined && output === undefined) return '—'
  return `${formatTokens((input ?? 0) + (cached ?? 0) + (output ?? 0))} tok`
}

function projectName(name: string): string {
  return name.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? name
}

export function ProjectsInsight({ projects, activeProjects, currency, periodLabel }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const allThreadsById = new Map(projects.map(project => [project.id ?? project.name, project.sessionDetails ?? []]))
  const visibleProjects = activeProjects.map(project => ({
    ...project,
    sessionDetails: allThreadsById.get(project.id ?? project.name) ?? project.sessionDetails,
  }))

  return (
    <div className="widget-projects">
      <div className="widget-projects-heading"><strong>Projects and threads</strong><span>{periodLabel} · all threads</span></div>
      {visibleProjects.length === 0 && <p className="widget-projects-empty">No projects recorded for this period.</p>}
      {visibleProjects.map((project, index) => {
        const key = project.id ?? project.name
        const isOpen = expanded === key || (expanded === null && index === 0)
        return (
          <div className="widget-project" key={key}>
            <button type="button" className="widget-project-row" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? '' : key)}>
              <span className="widget-project-chevron" aria-hidden="true">{isOpen ? '⌄' : '›'}</span>
              <strong title={project.name}>{projectName(project.name)}</strong>
              <span className="widget-project-tokens">{tokenLabel(project.inputTokens, project.cacheReadTokens, project.outputTokens)}</span>
              <span className="widget-project-cost">{formatCompactCurrency(project.cost, currency)}</span>
            </button>
            {isOpen && <div className="widget-task-list">
              {(project.sessionDetails ?? []).length === 0 && <span className="widget-projects-empty">No threads recorded.</span>}
              {(project.sessionDetails ?? []).map((task, taskIndex) => (
                <div className="widget-task" key={`${task.date}:${taskIndex}`}>
                  <span title={task.title ?? undefined}>{task.title || 'Untitled thread'}</span>
                  <small>{tokenLabel(task.inputTokens, task.cacheReadTokens, task.outputTokens)}</small>
                  <small>{formatCompactCurrency(task.cost, currency)}</small>
                </div>
              ))}
            </div>}
          </div>
        )
      })}
    </div>
  )
}
