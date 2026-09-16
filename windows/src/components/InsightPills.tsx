export type InsightMode = 'projects' | 'plan' | 'trend' | 'forecast' | 'calendar' | 'pulse' | 'stats' | 'optimize'

export const DEFAULT_INSIGHT: InsightMode = 'projects'

export const INSIGHT_LABELS: Record<InsightMode, string> = {
  projects: 'Projects',
  plan: 'Plan',
  trend: 'Trend',
  forecast: 'Forecast',
  calendar: 'Calendar',
  pulse: 'Pulse',
  stats: 'Stats',
  optimize: 'Optimize',
}

/// Same order as the macOS InsightMode enum: Plan first when it is visible.
export const INSIGHT_ORDER: InsightMode[] = [
  'projects', 'plan', 'trend', 'forecast', 'calendar', 'pulse', 'stats', 'optimize',
]

type Props = {
  selected: InsightMode
  onSelect: (m: InsightMode) => void
  modes: InsightMode[]
}

export function InsightPills({ selected, onSelect, modes }: Props) {
  return (
    <div className="insight-pills" role="tablist" aria-label="Insight">
      {modes.map(m => (
        <button
          key={m}
          type="button"
          role="tab"
          id={`insight-tab-${m}`}
          aria-selected={selected === m}
          aria-controls="insight-panel"
          className={`insight-pill ${selected === m ? 'insight-pill-active' : ''}`}
          onClick={() => onSelect(m)}
        >
          {INSIGHT_LABELS[m]}
        </button>
      ))}
    </div>
  )
}
