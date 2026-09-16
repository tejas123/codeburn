import type { CombinedUsage, MenubarPayload } from '../lib/payload'
import type { CurrencyState } from '../lib/currency'
import { formatCurrency, formatTokens } from '../lib/currency'
import { prettyDate, todayKey } from '../lib/dates'
import { SectionCaption } from './CollapsibleSection'
import { LeafIcon, MonitorIcon, WarningIcon } from './Icons'
import type { DisplayMetric } from '../lib/appSettings'
import { formatCombinedSessionCount, formatSessionCount, sessionCountIsExact, COMBINED_SESSION_COUNT_HELP, SESSION_COUNT_HELP } from '../lib/session-count-label'

type Props = {
  payload: MenubarPayload | null
  currency: CurrencyState
  periodLabel: string
  isToday: boolean
  /// Today's limit from the CLI config, in whatever the metric counts, or null when the
  /// alert is off.
  dailyBudget: number | null
  /// The tray's display metric determines the units used by budget alerts.
  metric: DisplayMetric
  /// True when the reader asked for every paired device, not just this one.
  combinedScope: boolean
}

export function HeroSection({ payload, currency, periodLabel, isToday, dailyBudget, metric, combinedScope }: Props) {
  const todayLabel = prettyDate(todayKey())
  // Pulling the peers is best effort in the CLI, so combined scope can come back with local
  // totals and no `combined` block. The hero then reads as a plain local view, plus a note.
  const combined = combinedScope ? payload?.combined ?? null : null
  const totals = combined?.combined
  const cost = totals?.cost ?? payload?.current.cost ?? 0
  const sessions = totals?.sessions ?? payload?.current.sessions ?? 0
  const sessionLabel = combined
    ? formatCombinedSessionCount()
    : formatSessionCount(sessions, payload?.current.sessionCountBasis).replace(/session/g, 'thread').replace(/Session/g, 'Thread')
  const sessionHelp = combined
    ? COMBINED_SESSION_COUNT_HELP
    : (sessionCountIsExact(payload?.current.sessionCountBasis) ? undefined : SESSION_COUNT_HELP)
  const inputTokens = totals?.inputTokens ?? payload?.current.inputTokens ?? 0
  const outputTokens = totals?.outputTokens ?? payload?.current.outputTokens ?? 0

  // The widget leads with API-equivalent cost; the tray metric still controls budget alerts.
  const isTokenMetric = metric === 'tokens' || metric === 'totalTokens'
  const unpriced = !combined && !!payload?.current.unpricedModels?.length
  const headline = unpriced && cost <= 0 ? 'Unpriced usage' : `${formatCurrency(cost, currency)}${unpriced ? ' + unpriced' : ''}`
  const totalTokens = totals
    ? totals.totalTokens ?? totals.inputTokens + totals.outputTokens + (totals.cacheReadTokens ?? 0) + (totals.cacheCreateTokens ?? 0)
    : inputTokens + outputTokens + (payload?.current.cacheReadTokens ?? 0) + (payload?.current.cacheWriteTokens ?? 0)
  const generated = payload?.generated ? new Date(payload.generated) : null
  const validGenerated = generated !== null && Number.isFinite(generated.getTime())

  const label = payload?.current.label || periodLabel
  const caption = combined ? `Combined · ${label}` : isToday ? `Today · ${todayLabel}` : label
  // The spend limit is stored in the display currency, as the CLI's own budget.daily is, and
  // reaches this component already converted to the dollars the payload is measured in. It is
  // printed back in the display currency, which is what the reader typed. Combined totals are
  // several machines' spend, which the limit was never set against.
  const measured = isTokenMetric ? inputTokens + outputTokens : cost
  const overBudget = isToday && !combinedScope && dailyBudget !== null && payload !== null && measured >= dailyBudget
  const savings = combined ? 0 : payload?.current.localModelSavings?.totalUSD ?? 0

  return (
    <section className="hero">
      <SectionCaption text={caption} />
      <div className="hero-row">
        {payload ? (
          <div className="hero-amount">{headline}</div>
        ) : (
          <div className="hero-amount hero-skeleton" aria-label="Loading" />
        )}
        <div className="hero-meta">
          {!payload ? (
            <>
              <span className="hero-skeleton-line" />
              <span className="hero-skeleton-line short" />
            </>
          ) : (
            <>
              <span>{formatTokens(totalTokens)} tokens</span>
              <span>{payload.current.topProjects?.length ?? 0} {combined ? 'local projects' : 'projects'}</span>
              <span title={sessionHelp}>{sessionLabel}</span>
            </>
          )}
        </div>
      </div>
      <p className="widget-cost-note">Estimated API-equivalent cost · not a bill</p>
      {combined && <p className="widget-cost-note">Projects and threads show this device only; shares use this device’s cost.</p>}
      {validGenerated && <p className="widget-cost-note">Updated <time dateTime={payload?.generated} title={generated.toLocaleString()}>{generated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></p>}
      {unpriced && <p className="widget-cost-note">Excludes unpriced usage: {payload?.current.unpricedModels?.map(entry => entry.model).join(', ')}</p>}
      {overBudget && dailyBudget !== null && (
        <div className="hero-note hero-note-warn">
          <WarningIcon size={10} />
          <span>
            Daily budget of {isTokenMetric ? `${formatTokens(dailyBudget)} tok` : formatCurrency(dailyBudget, currency)} exceeded
          </span>
        </div>
      )}
      {combined ? (
        <DeviceBreakdown usage={combined} currency={currency} />
      ) : combinedScope && payload !== null ? (
        <div className="hero-note hero-note-muted">
          <WarningIcon size={10} />
          <span>Combined unavailable · showing local</span>
        </div>
      ) : null}
      {/* Keep estimated avoided cost separate from recorded usage. */}
      {savings > 0 && (
        <div className="hero-note hero-note-saved">
          <LeafIcon size={10} />
          <span>Saved {formatCurrency(savings, currency)} with local models</span>
        </div>
      )}
    </section>
  )
}

function DeviceBreakdown({ usage, currency }: { usage: CombinedUsage; currency: CurrencyState }) {
  return (
    <div className="device-breakdown">
      <div className="hero-note hero-note-muted">
        <MonitorIcon size={10} />
        <span>{usage.combined.reachableCount} of {usage.combined.deviceCount} devices</span>
      </div>
      {usage.perDevice.map(device => (
        <div key={device.id} className="device-row">
          <span className={`device-dot ${device.error ? 'is-error' : ''}`} />
          <span className="device-name">{device.local ? `${device.name} · local` : device.name}</span>
          <span className="device-cost">
            {device.error ? 'Unavailable' : formatCurrency(device.cost, currency)}
          </span>
          <span className="device-tokens">{formatTokens(device.totalTokens)}</span>
        </div>
      ))}
    </div>
  )
}
