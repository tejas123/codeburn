import SwiftUI

struct WidgetUsageSummary: View {
    @Environment(AppStore.self) private var store
    @Binding var showsHistory: Bool

    private var current: CurrentBlock { store.payload.current }
    private var isToday: Bool { store.selectedPeriod == .today && !store.isDayMode }
    private var combined: CombinedUsageTotals? {
        store.activeScope == .combined ? store.payload.combined?.combined : nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(isToday ? L("Today") : store.selectionLabel)
                    .font(.system(size: 18, weight: .semibold))
                if isToday {
                    Text(Date(), format: .dateTime.day().month(.abbreviated))
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 8)
                Button {
                    showsHistory.toggle()
                } label: {
                    Label(L("History & filters"), systemImage: showsHistory ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .medium))
                }
                .buttonStyle(.plain)
            }
            if isToday {
                Text(L("Since midnight · Local time"))
                    .font(.system(size: 13)).foregroundStyle(.secondary)
            } else {
                Button(L("Back to Today")) {
                    store.selectedInsight = .projects
                    store.switchTo(period: .today)
                    showsHistory = false
                }
                .buttonStyle(.plain)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Theme.brandAccent)
            }
            Text(widgetCost(combined?.cost ?? current.cost, unpriced: !current.unpricedModels.isEmpty))
                .font(.system(size: 32, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Theme.brandAccent)
                .padding(.top, 4)
            Text(L("Estimated API-equivalent cost"))
                .font(.system(size: 13)).foregroundStyle(.secondary)
            Text(widgetTokenLabel(input: combined?.inputTokens ?? current.inputTokens,
                                  cached: combined?.cacheReadTokens ?? current.cacheReadTokens,
                                  written: combined?.cacheCreateTokens ?? current.cacheWriteTokens,
                                  output: combined?.outputTokens ?? current.outputTokens))
                .font(.system(size: 13)).monospacedDigit()
            HStack(spacing: 5) {
                Text(store.activeScope == .combined ? L("%lld local projects", current.topProjects.count) : L("%lld projects", current.topProjects.count))
                Text(verbatim: "·")
                Text(store.activeScope == .combined ? L("%lld local recorded threads", current.topProjects.reduce(0) { $0 + $1.sessionDetails.count }) : L("%lld recorded threads", current.topProjects.reduce(0) { $0 + $1.sessionDetails.count }))
            }
            .font(.system(size: 13)).foregroundStyle(.secondary)
            Text("\(store.activeScope.displayLabel) · \(store.selectedProvider.displayLabel)")
                .font(.system(size: 12)).foregroundStyle(.secondary)
            if store.activeScope == .combined {
                Text(L("Project and thread details cover this device only."))
                    .font(.system(size: 12)).foregroundStyle(.secondary)
            }
            if store.activeScope == .combined && combined == nil {
                Text(L("Combined unavailable · showing local"))
                    .font(.system(size: 12)).foregroundStyle(.secondary)
            }
            if store.selectedPayloadMayBeIncomplete {
                Text(L("This total may be incomplete."))
                    .font(.system(size: 13)).foregroundStyle(.secondary)
            }
            if !current.unpricedModels.isEmpty {
                Text(L("Some usage has no pricing. The estimate includes priced usage only."))
                    .font(.system(size: 12)).foregroundStyle(.secondary)
            }
            if isToday && store.shouldShowDailyBudgetWarning {
                Label(L("Daily budget of %@ exceeded", store.dailyBudgetLabel), systemImage: "exclamationmark.triangle.fill")
                    .font(.system(size: 13)).foregroundStyle(.orange)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
    }
}

struct WidgetFreshness: View {
    let payload: MenubarPayload

    private var generated: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: payload.generated) ?? ISO8601DateFormatter().date(from: payload.generated)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let generated {
                HStack(spacing: 4) {
                    Text(L("Data updated"))
                    Text(generated, style: .relative)
                    Text(L("ago"))
                }
            }
            Text(L("API-equivalent estimate, not your subscription charge."))
        }
        .font(.system(size: 12))
        .foregroundStyle(.secondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
    }
}
