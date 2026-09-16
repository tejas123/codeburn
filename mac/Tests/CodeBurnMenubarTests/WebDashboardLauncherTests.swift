import Foundation
import Testing
@testable import CodeBurnMenubar

@Suite("Web dashboard launcher")
struct WebDashboardLauncherTests {
    @Test("Full Report launches the existing CodeBurn web dashboard")
    @MainActor
    func launchesWebDashboard() {
        var receivedSubcommand: [String]?
        let process = Process()

        let launched = WebDashboardLauncher.open(
            isRunning: { false },
            makeProcess: { subcommand in
                receivedSubcommand = subcommand
                return process
            },
            run: { _ in }
        )

        #expect(launched)
        #expect(receivedSubcommand == ["web"])
    }

    @Test("A running dashboard is reused")
    @MainActor
    func reusesRunningDashboard() {
        let process = Process()
        var launchCount = 0

        #expect(WebDashboardLauncher.open(
            isRunning: { true },
            makeProcess: { _ in
                launchCount += 1
                return process
            },
            run: { _ in },
            openBrowser: { _ in }
        ))

        #expect(launchCount == 0)
    }

    @Test("A launch failure is reported")
    @MainActor
    func reportsLaunchFailure() {
        let process = Process()

        let launched = WebDashboardLauncher.open(
            isRunning: { false },
            makeProcess: { _ in process },
            run: { _ in throw CocoaError(.executableNotLoadable) }
        )

        #expect(!launched)
    }
}
