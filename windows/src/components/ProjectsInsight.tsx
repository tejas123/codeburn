import { useState } from 'react'

import type { ProjectEntry } from '../lib/payload'
import type { CurrencyState } from '../lib/currency'
import { formatCompactCurrency, formatTokens } from '../lib/currency'

type Props = { projects: ProjectEntry[]; currency: CurrencyState; periodLabel: string }

function tokenLabel(input?: number, cached?: number, output?: number): string {
  if (input === undefined && cached === undefined && output === undefined) return '—'
  return `${formatTokens((input ?? 0) + (cached ?? 0) + (output ?? 0))} tok`
}

function projectName(name: string): string {
  return name.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? name
}

export function ProjectsInsight({ projects, currency, periodLabel }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="widget-projects">
      <div className="widget-projects-heading"><strong>Projects and tasks</strong><span>{periodLabel}</span></div>
      {projects.length === 0 && <p className="widget-projects-empty">No projects recorded for this period.</p>}
      {projects.map((project, index) => {
        const isOpen = expanded === project.name || (expanded === null && index === 0)
        return (
          <div className="widget-project" key={`${project.name}:${index}`}>
            <button type="button" className="widget-project-row" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? '' : project.name)}>
              <span className="widget-project-chevron" aria-hidden="true">{isOpen ? '⌄' : '›'}</span>
              <strong title={project.name}>{projectName(project.name)}</strong>
              <span className="widget-project-tokens">{tokenLabel(project.inputTokens, project.cacheReadTokens, project.outputTokens)}</span>
              <span className="widget-project-cost">{formatCompactCurrency(project.cost, currency)}</span>
            </button>
            {isOpen && <div className="widget-task-list">
              {(project.sessionDetails ?? []).length === 0 && <span className="widget-projects-empty">No task details recorded.</span>}
              {(project.sessionDetails ?? []).map((task, taskIndex) => (
                <div className="widget-task" key={`${task.date}:${taskIndex}`}>
                  <span title={task.title ?? undefined}>{task.title || 'Untitled task'}</span>
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
