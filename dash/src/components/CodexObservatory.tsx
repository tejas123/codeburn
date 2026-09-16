import type { Payload, Period } from '@/lib/api'
import { buildCodexObservatory, selectDailyForPeriod } from '@/lib/codex-observatory'
import { fmtNum, fmtTokens, formatSessionCount, usd } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricCard } from '@/components/MetricCard'
import { DataTable } from '@/components/DataTable'
import { GranularUsageChart } from '@/components/UsageChart'

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function CodexObservatory({ payload, period }: { payload?: Payload; period: Period }) {
  if (!payload) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-24" />)}
      </div>
    )
  }

  const { current, history } = payload
  const periodDaily = selectDailyForPeriod(history.daily, period)
  const report = buildCodexObservatory({ current, daily: periodDaily })
  const processedTokens = current.inputTokens + current.cacheReadTokens + current.outputTokens
  const tokenBase = Math.max(processedTokens, 1)
  const tokenSegments = [
    { label: 'Fresh input', value: current.inputTokens, color: 'var(--color-chart-3)' },
    { label: 'Cached input', value: current.cacheReadTokens, color: 'var(--color-chart-1)' },
    { label: 'Output', value: current.outputTokens, color: 'var(--color-chart-4)' },
  ]

  return (
    <div className="codex-observatory">
      <Card className="relative mb-3 overflow-hidden border-primary/20 bg-[linear-gradient(125deg,var(--card)_0%,color-mix(in_oklab,var(--primary)_8%,var(--card))_100%)] px-6 py-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-primary/15" />
        <div className="pointer-events-none absolute -right-2 -top-8 h-36 w-36 rounded-full border border-primary/20" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-heading">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]" />
              Codex Observatory · local
            </div>
            <h2 className="max-w-xl font-display text-3xl leading-[1.05] tracking-[-0.035em] text-foreground sm:text-4xl">
              See where your context goes.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              A token-first view of your Codex sessions, model mix, cache reuse and project concentration.
            </p>
          </div>
          <div className="lg:text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-tertiary-foreground">Recorded tokens</div>
            <div className="mt-1 font-display text-5xl tracking-[-0.045em] tabular-nums text-primary">{fmtTokens(report.totalTokens)}</div>
            <div className="mt-2 text-xs text-tertiary-foreground">
              {formatSessionCount(current.sessions, current.sessionCountBasis)} · {fmtNum(current.calls)} calls
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total tokens" value={fmtTokens(report.totalTokens)} accent sub={`in ${fmtTokens(current.inputTokens)} / out ${fmtTokens(current.outputTokens)}`} />
        <MetricCard label="Active sessions" value={formatSessionCount(current.sessions, current.sessionCountBasis)} sub="With Codex usage in this period" />
        <MetricCard label="Input cache share" value={pct(report.cacheShare)} sub={`${fmtTokens(current.cacheReadTokens)} reused tokens`} />
        <MetricCard label="API-equivalent" value={usd(current.cost)} sub="Standard list-price estimate" />
      </div>

      <div className="mb-3 grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <Card className="overflow-hidden px-5 py-4">
          <div className="mb-1 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-heading">Token activity</h3>
              <p className="mt-1 text-xs text-tertiary-foreground">Codex usage across the selected period</p>
            </div>
            <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-tertiary-foreground">UTC</span>
          </div>
          <div className="h-72 pt-3">
            <GranularUsageChart daily={history.daily} timeline={history.timeline} unit="tokens" />
          </div>
        </Card>

        <Card className="px-5 py-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-heading">Token anatomy</h3>
              <p className="mt-1 text-xs text-tertiary-foreground">Fresh input, reused context and generated output.</p>
          <div className="mt-7 flex h-3 overflow-hidden rounded-full bg-interactive-secondary">
            {tokenSegments.map((segment) => (
              <div key={segment.label} style={{ width: `${(segment.value / tokenBase) * 100}%`, background: segment.color }} />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {tokenSegments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: segment.color }} />
                  {segment.label}
                </div>
                <div className="tabular-nums text-foreground">
                  {fmtTokens(segment.value)} <span className="ml-1 text-xs text-tertiary-foreground">{pct(segment.value / tokenBase)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-tertiary-foreground">Average per call</div>
            <div className="mt-1 font-display text-2xl tabular-nums text-foreground">{fmtTokens(report.averageTokensPerCall)}</div>
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <Card className="px-5 py-4">
          <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-heading">Models by token volume</h3>
          <DataTable
            columns={[
              { key: 'model', label: 'Model' },
              { key: 'tokens', label: 'Tokens', num: true },
              { key: 'share', label: 'Share', num: true },
              { key: 'calls', label: 'Calls', num: true },
            ]}
            rows={report.models.slice(0, 10).map((model) => ({
              model: model.name,
              tokens: fmtTokens(model.tokens),
              share: pct(model.share),
              calls: fmtNum(model.calls),
            }))}
          />
        </Card>

        <Card className="px-5 py-4">
          <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-heading">Projects</h3>
          <DataTable
            columns={[
              { key: 'project', label: 'Project' },
              { key: 'sessions', label: 'Sessions', num: true },
              { key: 'cost', label: 'Estimate', num: true },
            ]}
            rows={report.projects.slice(0, 10).map((project) => ({
              project: project.name,
              sessions: formatSessionCount(project.sessions, project.sessionCountBasis),
              cost: usd(project.cost),
            }))}
          />
        </Card>
      </div>

      <Card className="px-5 py-4">
        <div className="mb-3.5 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-heading">Daily ledger</h3>
            <p className="mt-1 text-xs text-tertiary-foreground">Most recent Codex usage days</p>
          </div>
          <span className="text-xs text-tertiary-foreground">{periodDaily.length} recorded days</span>
        </div>
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'input', label: 'Input', num: true },
            { key: 'output', label: 'Output', num: true },
            { key: 'total', label: 'Total', num: true },
          ]}
          rows={[...periodDaily].reverse().slice(0, 14).map((day) => ({
            date: day.date,
            input: fmtTokens(day.inputTokens),
            output: fmtTokens(day.outputTokens),
            total: fmtTokens(day.inputTokens + day.outputTokens),
          }))}
        />
      </Card>
    </div>
  )
}
