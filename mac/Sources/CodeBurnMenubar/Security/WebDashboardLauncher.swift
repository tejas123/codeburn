import AppKit
import Foundation

/// Starts CodeBurn's existing browser dashboard without showing a terminal window.
///
/// The CLI owns browser opening on the first launch. While that process remains alive, later
/// clicks simply bring the known local dashboard URL back to the user's default browser.
@MainActor
enum WebDashboardLauncher {
    private static var process: Process?
    private static let dashboardURL = URL(string: "http://127.0.0.1:4747")!

    @discardableResult
    static func open(
        isRunning: (() -> Bool)? = nil,
        makeProcess: ([String]) -> Process = { CodeburnCLI.makeProcess(subcommand: $0) },
        run: (Process) throws -> Void = { try $0.run() },
        openBrowser: (URL) -> Void = { NSWorkspace.shared.open($0) }
    ) -> Bool {
        if isRunning?() ?? process?.isRunning == true {
            openBrowser(dashboardURL)
            return true
        }

        let dashboard = makeProcess(["web"])
        do {
            try run(dashboard)
            process = dashboard
            return true
        } catch {
            NSLog("CodeBurn: could not open the web dashboard: \(error.localizedDescription)")
            return false
        }
    }
}
