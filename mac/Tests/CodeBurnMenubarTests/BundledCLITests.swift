import Foundation
import Testing
@testable import CodeBurnMenubar

@Suite("Bundled CLI")
struct BundledCLITests {
    @Test("A self-contained app uses its runtime and preserves spaces in paths")
    func bundledRuntime() throws {
        let resources = FileManager.default.temporaryDirectory
            .appendingPathComponent("CodeBurn Test \(UUID().uuidString)/Resources")
        defer { try? FileManager.default.removeItem(at: resources.deletingLastPathComponent()) }
        let runtime = resources.appendingPathComponent("cli/node")
        let entrypoint = resources.appendingPathComponent("cli/dist/cli.js")
        try FileManager.default.createDirectory(at: runtime.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("#!/bin/sh\n".utf8).write(to: runtime)
        try FileManager.default.createDirectory(at: entrypoint.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data().write(to: entrypoint)
        #expect(CodeburnCLI.bundledArgv(resources: resources) == nil)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: runtime.path)
        #expect(CodeburnCLI.bundledArgv(resources: resources) == [runtime.path, entrypoint.path])
        try FileManager.default.removeItem(at: entrypoint)
        #expect(CodeburnCLI.bundledArgv(resources: resources) == nil)
        #expect(CodeburnCLI.bundledArgv(resources: nil) == nil)
    }
}
