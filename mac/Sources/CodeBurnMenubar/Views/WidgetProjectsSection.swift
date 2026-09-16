import SwiftUI

/// Period-scoped projects. Selecting a thread never changes the overview total.
struct WidgetProjectsSection: View {
    let current: CurrentBlock
    let periodLabel: String
    var combinedScope = false
    @State private var expanded: String?
    @State private var selection: ThreadSelection?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private struct ThreadSelection {
        let projectID: String
        let threadID: String
    }

    private var projects: [ProjectEntry] {
        current.topProjects.sorted {
            $0.cost == $1.cost ? ($0.id ?? $0.name) < ($1.id ?? $1.name) : $0.cost > $1.cost
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let selection,
               let project = projects.first(where: { projectKey($0) == selection.projectID }),
               let thread = project.sessionDetails.enumerated().first(where: {
                   threadKey($0.element, index: $0.offset) == selection.threadID
               })?.element {
                WidgetThreadDetail(thread: thread, projectName: project.name, periodLabel: periodLabel) {
                    self.selection = nil
                }
            } else {
                HStack(alignment: .firstTextBaseline) {
                    Text(L("Projects"))
                        .font(.system(size: 16, weight: .semibold))
                    Spacer()
                    Text(L("Highest cost first"))
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                if !current.unpricedModels.isEmpty {
                    Text(L("Percentages use priced usage only."))
                        .font(.system(size: 12)).foregroundStyle(.secondary)
                }
                if combinedScope {
                    Text(L("Project details are for this device. Shares use this device's cost."))
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                if projects.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(L("No usage recorded for %@", periodLabel))
                            .font(.system(size: 15, weight: .medium))
                        Text(L("Projects will appear as you work. Use History to view earlier days."))
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 20)
                }
                ForEach(Array(projects.enumerated()), id: \.element.stableID) { index, project in
                    projectRow(project, index: index)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func projectKey(_ project: ProjectEntry) -> String { project.id ?? project.name }

    private func threadKey(_ thread: SessionDetailEntry, index: Int) -> String {
        if let id = thread.sessionId { return "\(thread.provider ?? ""):\(id)" }
        return "\(thread.date):\(thread.title ?? ""):\(index)"
    }

    private func projectRow(_ project: ProjectEntry, index: Int) -> some View {
        let key = projectKey(project)
        let isOpen = expanded == key || (expanded == nil && index == 0)
        let hasShare = current.cost > 0 && (project.unpricedModels.isEmpty || project.cost > 0)
        let fraction = current.cost > 0 ? min(1, max(0, project.cost / current.cost)) : 0
        return VStack(alignment: .leading, spacing: 10) {
            Button {
                withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.18)) {
                    expanded = isOpen ? "" : key
                }
            } label: {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Image(systemName: isOpen ? "chevron.down" : "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .frame(width: 12)
                            .accessibilityHidden(true)
                        Text(project.name.isEmpty ? L("No project") : project.name)
                            .font(.system(size: 16, weight: .semibold))
                            .lineLimit(2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(widgetCost(project.cost, unpriced: !project.unpricedModels.isEmpty))
                            .font(.system(size: 16, weight: .semibold))
                            .monospacedDigit()
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    HStack {
                        Text(project.sessionDetails.count == 1 ? L("1 recorded thread") : L("%lld recorded threads", project.sessionDetails.count))
                        Text(verbatim: "·")
                        Text(widgetTokenLabel(input: project.inputTokens, cached: project.cacheReadTokens, written: project.cacheWriteTokens, output: project.outputTokens))
                        Spacer(minLength: 2)
                        if hasShare {
                            Text(String(format: "%.0f%%", fraction * 100))
                                .monospacedDigit()
                        }
                    }
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .padding(.leading, 20)
                    GeometryReader { proxy in
                        Capsule().fill(Color.secondary.opacity(0.12))
                            .overlay(alignment: .leading) {
                                Capsule().fill(Theme.brandAccent)
                                    .frame(width: hasShare ? proxy.size.width * fraction : 0)
                            }
                    }
                    .frame(height: 4)
                    .padding(.leading, 20)
                    .accessibilityHidden(true)
                }
                .padding(.vertical, 5)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityValue(isOpen ? L("Expanded") : L("Collapsed"))
            .help(project.name)

            if isOpen {
                if project.sessionDetails.isEmpty {
                    Text(L("Thread details are unavailable for this recorded usage."))
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .padding(.leading, 20)
                }
                ForEach(project.sessionDetails.enumerated().sorted {
                    $0.element.cost == $1.element.cost ? $0.offset < $1.offset : $0.element.cost > $1.element.cost
                }, id: \.offset) { index, thread in
                    Button {
                        selection = ThreadSelection(projectID: key, threadID: threadKey(thread, index: index))
                    } label: {
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(thread.title?.isEmpty == false ? thread.title! : L("Untitled thread"))
                                    .font(.system(size: 14))
                                    .lineLimit(2)
                                Text(widgetTokenLabel(input: thread.inputTokens, cached: thread.cacheReadTokens, written: thread.cacheWriteTokens, output: thread.outputTokens))
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            Text(widgetCost(thread.cost, unpriced: !thread.unpricedModels.isEmpty))
                                .font(.system(size: 14, weight: .medium))
                                .monospacedDigit()
                                .fixedSize(horizontal: true, vertical: false)
                        }
                        .padding(.vertical, 7)
                        .padding(.leading, 20)
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            Divider()
        }
    }
}

private struct WidgetThreadDetail: View {
    let thread: SessionDetailEntry
    let projectName: String
    let periodLabel: String
    let back: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Button(action: back) {
                Label(L("Back to projects"), systemImage: "arrow.left")
                    .font(.system(size: 14, weight: .medium))
                    .frame(minHeight: 36)
            }
            .buttonStyle(.plain)
            Text(projectName).font(.system(size: 13)).foregroundStyle(.secondary)
            Text(thread.title?.isEmpty == false ? thread.title! : L("Untitled thread"))
                .font(.system(size: 18, weight: .semibold))
                .fixedSize(horizontal: false, vertical: true)
            HStack(alignment: .firstTextBaseline) {
                Text(widgetCost(thread.cost, unpriced: !thread.unpricedModels.isEmpty))
                    .font(.system(size: 26, weight: .semibold)).monospacedDigit()
                Spacer()
                Text(periodLabel).font(.system(size: 13)).foregroundStyle(.secondary)
            }
            Text(L("Estimated API-equivalent cost · not a bill"))
                .font(.system(size: 12)).foregroundStyle(.secondary)
            if !thread.unpricedModels.isEmpty {
                Text(L("Pricing unavailable for: %@", thread.unpricedModels.joined(separator: ", ")))
                    .font(.system(size: 13)).foregroundStyle(.secondary)
            }
            VStack(spacing: 10) {
                tokenRow(L("Uncached input"), thread.inputTokens)
                tokenRow(L("Cached input"), thread.cacheReadTokens)
                if let written = thread.cacheWriteTokens { tokenRow(L("Cache writes"), written) }
                tokenRow(L("Output"), thread.outputTokens)
            }
            Divider()
            Text(L("Cost by model")).font(.system(size: 15, weight: .semibold))
            if thread.models.isEmpty {
                Text(L("Model breakdown unavailable.")).font(.system(size: 13)).foregroundStyle(.secondary)
            }
            ForEach(Array(thread.models.sorted { $0.cost > $1.cost }.enumerated()), id: \.offset) { _, model in
                HStack(alignment: .firstTextBaseline) {
                    Text(model.name).frame(maxWidth: .infinity, alignment: .leading)
                    Text(widgetCost(model.cost, unpriced: thread.unpricedModels.contains(model.name)))
                        .monospacedDigit().fixedSize(horizontal: true, vertical: false)
                }
                .font(.system(size: 14))
            }
        }
    }

    private func tokenRow(_ label: String, _ value: Int?) -> some View {
        HStack {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text(value.map { $0.asThousandsSeparated() } ?? L("Unavailable")).monospacedDigit()
        }
        .font(.system(size: 14))
    }
}

extension ProjectEntry {
    var stableID: String { id ?? name }
}

@MainActor
func widgetCost(_ cost: Double, unpriced: Bool) -> String {
    if unpriced && cost == 0 { return L("Unpriced") }
    if unpriced { return L("%@ + unpriced", cost.asCurrency()) }
    return cost.asCurrency()
}

func widgetTokenLabel(input: Int?, cached: Int?, written: Int?, output: Int?) -> String {
    guard input != nil || cached != nil || written != nil || output != nil else { return L("Tokens unavailable") }
    let total = (input ?? 0) + (cached ?? 0) + (written ?? 0) + (output ?? 0)
    return L("%@ tokens", total.formatted(.number.locale(Locale(identifier: "en_US")).notation(.compactName)))
}
